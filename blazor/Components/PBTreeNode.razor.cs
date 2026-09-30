using Microsoft.AspNetCore.Components.Web;

namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>
/// A node of a <see cref="PBTree"/> (mat-nested-tree-node). Nest child nodes as child content; a node
/// with children gets a toggle (matTreeNodeToggle). Keyboard (CDK tree): Up/Down move between visible
/// nodes, Right expands or enters, Left collapses or goes to the parent, Home/End, Enter/Space toggle.
/// </summary>
public partial class PBTreeNode : WorkspaceComponentBase
{
    [CascadingParameter] private PBTree? Tree { get; set; }

    [CascadingParameter(Name = "PBTreeParent")] private PBTreeNode? Parent { get; set; }

    /// <summary>Rich label content, used after/instead of <c>Label</c>.</summary>
    [Parameter] public RenderFragment? LabelContent { get; set; }

    /// <summary>Leading icon.</summary>
    [Parameter] public RenderFragment? Icon { get; set; }

    [Parameter] public bool Expanded { get; set; }
    [Parameter] public EventCallback<bool> ExpandedChanged { get; set; }

    /// <summary>Set when the node has children but they are not declared yet (e.g. lazy loading).</summary>
    [Parameter] public bool Expandable { get; set; }

    private ElementReference item;

    private int Level => Parent is null ? 0 : Parent.Level + 1;

    private bool HasChildren => ChildContent is not null || Expandable;

    private async Task SetExpandedAsync(bool value)
    {
        if (!HasChildren || Expanded == value) return;
        Expanded = value;
        await ExpandedChanged.InvokeAsync(value);
    }

    private Task ToggleAsync() => SetExpandedAsync(!Expanded);

    private async Task OnKeyDownAsync(KeyboardEventArgs e)
    {
        switch (e.Key)
        {
            case "ArrowDown" or "ArrowUp" or "Home" or "End":
                await DesignSystemJs.InvokeVoidAsync(JS, "moveFocusInTree", item, e.Key);
                break;
            case "ArrowRight":
                if (HasChildren && !Expanded) await SetExpandedAsync(true);
                else if (Expanded) await DesignSystemJs.InvokeVoidAsync(JS, "focusFirstChildTreeItem", item);
                break;
            case "ArrowLeft":
                if (Expanded) await SetExpandedAsync(false);
                else await DesignSystemJs.InvokeVoidAsync(JS, "focusParentTreeItem", item);
                break;
            case "Enter" or " ":
                await ToggleAsync();
                break;
        }
    }

    public void Dispose() => Tree?.Unregister(this);
}
