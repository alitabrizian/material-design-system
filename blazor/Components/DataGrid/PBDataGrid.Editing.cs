using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Reflection;
using Microsoft.AspNetCore.Components.Forms;

namespace PartoBita.DesignSystem.Blazor.Components;

public partial class PBDataGrid<TItem>
{
    private static readonly MethodInfo MemberwiseCloneMethod = typeof(object).GetMethod("MemberwiseClone", BindingFlags.Instance | BindingFlags.NonPublic)!;

    private TItem? editItem;
    private TItem? editModel;
    private bool editIsNew;
    private EditContext? editContext;
    private string? editCellKey;
    private bool popupEditOpen;
    private bool focusEditorAfterRender;
    private readonly Dictionary<(object Model, string Column), string> parseErrors = [];

    private TItem? pendingDelete;
    private bool deleteDialogOpen;

    // Batch mode: edited copies, new rows and deleted rows wait here until Save.
    private readonly Dictionary<object, (TItem Original, TItem Clone)> batchUpdated = [];
    private readonly List<TItem> batchInserted = [];
    private readonly Dictionary<object, TItem> batchDeleted = [];
    private (object Key, string Column)? batchCell;
    private readonly Dictionary<(object Key, string Member), string> batchErrors = [];

    private bool CanEditRows =>
        EditModelSaving.HasDelegate || BatchSaving.HasDelegate || EditMode is PBGridEditMode.EditCell or PBGridEditMode.Batch
        || allColumns.Any(c => c is PBDataGridCommandColumn) || NewItemRowPosition != PBGridNewItemRowPosition.Disabled;

    /// <summary>True while a row (or a new row) is being edited.</summary>
    public bool IsEditing => editModel is not null;

    public bool IsEditingNewRow => editModel is not null && editIsNew;

    private bool IsEditingRow(TItem item) => editModel is not null && !editIsNew && editItem is not null && Equals(KeyOf(editItem), KeyOf(item));

    private static TItem Clone(TItem item) => item is null ? item : (TItem)MemberwiseCloneMethod.Invoke(item, null)!;

    private static void CopyInto(TItem source, TItem target)
    {
        foreach (var property in typeof(TItem).GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            if (property.CanRead && property.CanWrite && property.SetMethod?.IsPublic == true && property.GetIndexParameters().Length == 0)
                property.SetValue(target, property.GetValue(source));
        }
    }

    private TItem NewItem()
    {
        try
        {
            return Activator.CreateInstance<TItem>();
        }
        catch (MissingMethodException)
        {
            return default!;
        }
    }

    /// <summary>Opens the editor for an item (the edit model is a copy until Save).</summary>
    public async Task StartEditDataItemAsync(TItem item)
    {
        if (EditMode == PBGridEditMode.Batch) return;
        if (editModel is not null) await CancelEditAsync();
        await BeginEditAsync(item, Clone(item), isNew: false);
    }

    /// <summary>Opens the editor for a new row (or adds a pending row in batch mode).</summary>
    public async Task StartEditNewRowAsync()
    {
        var args = new PBGridCustomizeEditModelEventArgs<TItem>(NewItem(), default, true);
        await CustomizeEditModel.InvokeAsync(args);
        if (args.EditModel is null) throw new InvalidOperationException($"{typeof(TItem).Name} has no parameterless constructor: create the new item in CustomizeEditModel.");
        if (EditMode == PBGridEditMode.Batch)
        {
            batchInserted.Insert(0, args.EditModel);
            batchCell = (KeyOf(args.EditModel), VisibleLeaves().FirstOrDefault(c => c.CanEdit(typeof(TItem)))?.Key ?? "");
            focusEditorAfterRender = true;
            pageIndex = 0;
            Invalidate();
            return;
        }
        if (editModel is not null) await CancelEditAsync();
        editItem = default;
        editIsNew = true;
        editModel = args.EditModel;
        StartEditContext();
    }

    private async Task BeginEditAsync(TItem item, TItem model, bool isNew, string? cell = null)
    {
        var args = new PBGridCustomizeEditModelEventArgs<TItem>(model, item, isNew);
        await CustomizeEditModel.InvokeAsync(args);
        editItem = item;
        editIsNew = isNew;
        editModel = args.EditModel;
        editCellKey = cell;
        StartEditContext();
    }

    private void StartEditContext()
    {
        editContext = new EditContext(editModel!);
        parseErrors.Clear();
        popupEditOpen = EditMode == PBGridEditMode.PopupEditForm;
        focusEditorAfterRender = true;
        StateHasChanged();
    }

    /// <summary>Validates and saves the current edit (or all batch changes). False when validation failed or a handler cancelled.</summary>
    public async Task<bool> SaveChangesAsync()
    {
        if (EditMode == PBGridEditMode.Batch) return await SaveBatchAsync();
        if (editModel is null || editContext is null) return true;
        if (parseErrors.Count > 0 || !editContext.Validate())
        {
            StateHasChanged();
            return false;
        }
        var args = new PBGridEditModelSavingEventArgs<TItem>(editModel, editItem, editIsNew);
        if (EditModelSaving.HasDelegate)
        {
            await EditModelSaving.InvokeAsync(args);
        }
        else if (editIsNew)
        {
            if (Data is IList<TItem> { IsReadOnly: false } list) list.Add(editModel);
        }
        else if (editItem is not null)
        {
            if (typeof(TItem).IsValueType && Data is IList<TItem> { IsReadOnly: false } list)
            {
                var index = list.IndexOf(editItem);
                if (index >= 0) list[index] = editModel;
            }
            else
            {
                CopyInto(editModel, editItem);
            }
        }
        if (args.Cancel) return false;
        EndEdit();
        Invalidate();
        return true;
    }

    /// <summary>Closes the editor without saving (batch mode: drops every pending change).</summary>
    public Task CancelEditAsync()
    {
        if (EditMode == PBGridEditMode.Batch)
        {
            batchUpdated.Clear();
            batchInserted.Clear();
            batchDeleted.Clear();
            batchErrors.Clear();
            batchCell = null;
            Invalidate();
            return Task.CompletedTask;
        }
        EndEdit();
        StateHasChanged();
        return Task.CompletedTask;
    }

    private void EndEdit()
    {
        editModel = default;
        editItem = default;
        editContext = null;
        editCellKey = null;
        editIsNew = false;
        popupEditOpen = false;
        parseErrors.Clear();
    }

    private async Task OnPopupEditOpenChangedAsync(bool open)
    {
        if (!open) await CancelEditAsync();
    }

    // ------------------------------------------------------------------------------ deleting

    /// <summary>Asks the user to confirm, then deletes the item (when <see cref="ConfirmDelete"/> is off: deletes at once).</summary>
    public async Task ShowDataItemDeleteConfirmationAsync(TItem item)
    {
        if (!ConfirmDelete || EditMode == PBGridEditMode.Batch)
        {
            await DeleteDataItemAsync(item);
            return;
        }
        pendingDelete = item;
        deleteDialogOpen = true;
        StateHasChanged();
    }

    private async Task ConfirmDeleteAsync(bool confirmed)
    {
        deleteDialogOpen = false;
        var item = pendingDelete;
        pendingDelete = default;
        if (confirmed && item is not null) await DeleteDataItemAsync(item);
        StateHasChanged();
    }

    public async Task DeleteDataItemAsync(TItem item)
    {
        if (EditMode == PBGridEditMode.Batch)
        {
            var key = KeyOf(item);
            if (batchInserted.Remove(item)) { }
            else batchDeleted[key] = item;
            batchUpdated.Remove(key);
            Invalidate();
            return;
        }
        var args = new PBGridDataItemDeletingEventArgs<TItem>(item);
        if (DataItemDeleting.HasDelegate) await DataItemDeleting.InvokeAsync(args);
        else if (Data is IList<TItem> { IsReadOnly: false } list) list.Remove(item);
        if (args.Cancel) return;
        selected.Remove(KeyOf(item));
        if (IsEditingRow(item)) EndEdit();
        Invalidate();
    }

    // ------------------------------------------------------------------------------ editor values

    private TItem ModelFor(GridRow row)
    {
        var item = row.Item!;
        if (EditMode == PBGridEditMode.Batch && batchUpdated.TryGetValue(KeyOf(item), out var pair)) return pair.Clone;
        return item;
    }

    private async Task SetEditValueAsync(TItem model, PBDataGridColumn column, object? raw)
    {
        if (column.FieldName is null || model is null) return;
        var type = column.FieldType(typeof(TItem)) ?? typeof(string);
        var errorKey = ((object)model, column.Key);
        try
        {
            GridField.SetValue(model, column.FieldName, raw is string s && type != typeof(string) && string.IsNullOrWhiteSpace(s) ? null : raw);
            parseErrors.Remove(errorKey);
        }
        catch (Exception e) when (e is FormatException or InvalidCastException or ArgumentException or OverflowException or NotSupportedException)
        {
            parseErrors[errorKey] = $"'{raw}' is not a valid {column.DisplayCaption.ToLowerInvariant()}.";
        }
        if (editContext is not null && ReferenceEquals(editContext.Model, model) && FieldId(model, column.FieldName) is { } field)
            editContext.NotifyFieldChanged(field);
        if (EditMode == PBGridEditMode.Batch)
        {
            batchErrors.Remove((KeyOf(model), column.FieldName));
            Invalidate();
        }
        await Task.CompletedTask;
    }

    private static FieldIdentifier? FieldId(object model, string path)
    {
        var parts = path.Split('.');
        object? owner = model;
        for (var i = 0; i < parts.Length - 1 && owner is not null; i++)
            owner = owner.GetType().GetProperty(parts[i])?.GetValue(owner);
        return owner is null ? null : new FieldIdentifier(owner, parts[^1]);
    }

    private IEnumerable<string> EditMessages(TItem model, PBDataGridColumn column)
    {
        if (parseErrors.TryGetValue(((object)model!, column.Key), out var parse)) yield return parse;
        if (EditMode == PBGridEditMode.Batch)
        {
            if (column.FieldName is not null && batchErrors.TryGetValue((KeyOf(model), column.FieldName), out var batch)) yield return batch;
            yield break;
        }
        if (editContext is null || column.FieldName is null || FieldId(model!, column.FieldName) is not { } field) yield break;
        foreach (var message in editContext.GetValidationMessages(field)) yield return message;
    }

    private static string EditorText(object? value, PBGridEditorType editor) => value switch
    {
        null => "",
        DateTime d when editor == PBGridEditorType.Date => d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        DateOnly d => d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        IFormattable f when editor == PBGridEditorType.Number => f.ToString(null, CultureInfo.InvariantCulture),
        _ => value.ToString() ?? "",
    };

    /// <summary>Editors post numbers and dates in invariant form; convert them before they reach the model.</summary>
    private static object? ParseEditorInput(string? text, Type type, PBGridEditorType editor)
    {
        if (string.IsNullOrEmpty(text)) return text;
        var underlying = Nullable.GetUnderlyingType(type) ?? type;
        if (editor == PBGridEditorType.Number && GridField.IsNumeric(underlying))
            return Convert.ChangeType(decimal.Parse(text, NumberStyles.Float, CultureInfo.InvariantCulture), underlying, CultureInfo.InvariantCulture);
        if (editor == PBGridEditorType.Date)
        {
            var date = DateTime.ParseExact(text, "yyyy-MM-dd", CultureInfo.InvariantCulture);
            return underlying == typeof(DateOnly) ? DateOnly.FromDateTime(date) : underlying == typeof(DateTimeOffset) ? new DateTimeOffset(date) : date;
        }
        return text;
    }

    private async Task OnEditorChangedAsync(TItem model, PBDataGridColumn column, ChangeEventArgs e, PBGridEditorType editor)
    {
        var type = column.FieldType(typeof(TItem)) ?? typeof(string);
        object? value;
        try
        {
            value = e.Value is bool b ? b : ParseEditorInput(e.Value?.ToString(), type, editor);
        }
        catch (Exception ex) when (ex is FormatException or OverflowException or InvalidCastException)
        {
            parseErrors[((object)model!, column.Key)] = $"'{e.Value}' is not a valid {column.DisplayCaption.ToLowerInvariant()}.";
            StateHasChanged();
            return;
        }
        if (editor == PBGridEditorType.ComboBox && e.Value is string selectedText)
        {
            var match = column.ComboItems(typeof(TItem)).FirstOrDefault(v => EditorText(v, editor) == selectedText);
            value = match ?? (string.IsNullOrEmpty(selectedText) ? null : selectedText);
        }
        await SetEditValueAsync(model, column, value);
    }

    private async Task OnEditorKeyDownAsync(KeyboardEventArgs e)
    {
        if (e.Key == "Escape")
        {
            if (EditMode == PBGridEditMode.Batch) batchCell = null;
            else await CancelEditAsync();
        }
        else if (e.Key == "Enter" && EditMode is PBGridEditMode.EditRow or PBGridEditMode.EditCell)
        {
            await SaveChangesAsync();
        }
        else if (e.Key == "Enter" && EditMode == PBGridEditMode.Batch)
        {
            batchCell = null;
        }
    }

    // ------------------------------------------------------------------------------ cell editing (EditCell and Batch)

    private bool IsCellEditor(GridRow row, PBDataGridColumn column)
    {
        if (!column.CanEdit(typeof(TItem))) return false;
        return EditMode switch
        {
            PBGridEditMode.EditRow => IsEditingRow(row.Item!),
            PBGridEditMode.EditCell => IsEditingRow(row.Item!) && editCellKey == column.Key,
            PBGridEditMode.Batch => batchCell is { } cell && Equals(cell.Key, KeyOf(row.Item!)) && cell.Column == column.Key && !batchDeleted.ContainsKey(cell.Key),
            _ => false,
        };
    }

    private async Task OnCellClickAsync(GridRow row, PBDataGridColumn column)
    {
        if (!column.CanEdit(typeof(TItem))) return;
        var item = row.Item!;
        if (EditMode == PBGridEditMode.EditCell)
        {
            if (IsEditingRow(item))
            {
                editCellKey = column.Key;
                focusEditorAfterRender = true;
                return;
            }
            if (editModel is not null && !await SaveChangesAsync()) return;
            await BeginEditAsync(item, Clone(item), isNew: false, cell: column.Key);
        }
        else if (EditMode == PBGridEditMode.Batch)
        {
            var key = KeyOf(item);
            if (batchDeleted.ContainsKey(key)) return;
            if (!row.IsInserted && !batchUpdated.ContainsKey(key)) batchUpdated[key] = (item, Clone(item));
            batchCell = (key, column.Key);
            focusEditorAfterRender = true;
        }
    }

    private async Task OnCellEditorFocusOutAsync()
    {
        if (EditMode == PBGridEditMode.EditCell && editModel is not null && !editIsNew) await SaveChangesAsync();
    }

    private bool IsCellModified(GridRow row, PBDataGridColumn column) =>
        EditMode == PBGridEditMode.Batch && row.Item is not null && batchUpdated.TryGetValue(KeyOf(row.Item), out var pair)
        && !Equals(column.GetValue(pair.Original!), column.GetValue(pair.Clone!));

    private bool IsRowDeleted(GridRow row) => EditMode == PBGridEditMode.Batch && row.Item is not null && batchDeleted.ContainsKey(KeyOf(row.Item));

    private bool HasBatchChanges =>
        batchInserted.Count > 0 || batchDeleted.Count > 0 || batchUpdated.Values.Any(p => DataColumns.Any(c => !Equals(c.GetValue(p.Original!), c.GetValue(p.Clone!))));

    private void RestoreRow(TItem item)
    {
        batchDeleted.Remove(KeyOf(item));
        Invalidate();
    }

    private async Task<bool> SaveBatchAsync()
    {
        batchErrors.Clear();
        var updated = batchUpdated.Values.Where(p => DataColumns.Any(c => !Equals(c.GetValue(p.Original!), c.GetValue(p.Clone!)))).ToList();
        foreach (var model in updated.Select(p => p.Clone).Concat(batchInserted))
        {
            var results = new List<ValidationResult>();
            if (model is null || Validator.TryValidateObject(model, new ValidationContext(model), results, validateAllProperties: true)) continue;
            foreach (var result in results)
                foreach (var member in result.MemberNames)
                    batchErrors[(KeyOf(model), member)] = result.ErrorMessage ?? "Invalid value.";
        }
        if (batchErrors.Count > 0 || parseErrors.Count > 0)
        {
            StateHasChanged();
            return false;
        }
        var changes = new PBGridBatchChanges<TItem>(
            updated.Select(p => new PBGridBatchUpdate<TItem>(p.Original, p.Clone)).ToList(),
            batchInserted.ToList(),
            batchDeleted.Values.ToList());
        if (BatchSaving.HasDelegate)
        {
            await BatchSaving.InvokeAsync(changes);
        }
        else
        {
            foreach (var update in changes.UpdatedItems) CopyInto(update.EditModel, update.DataItem);
            if (Data is IList<TItem> { IsReadOnly: false } list)
            {
                foreach (var item in changes.InsertedItems) list.Add(item);
                foreach (var item in changes.DeletedItems) list.Remove(item);
            }
        }
        batchUpdated.Clear();
        batchInserted.Clear();
        batchDeleted.Clear();
        batchCell = null;
        Invalidate();
        return true;
    }
}
