using System.Collections.Concurrent;
using System.ComponentModel;
using System.Globalization;
using System.Linq.Expressions;
using System.Reflection;

namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>
/// Reads and writes an item's field by name ("Name" or a nested path like "Customer.Name"), and
/// builds the matching LINQ member expressions so filters, sorting and summaries also run on an
/// <see cref="IQueryable{T}"/> (Entity Framework translates them to SQL).
/// </summary>
internal static class GridField
{
    private static readonly ConcurrentDictionary<(Type, string), Func<object, object?>> Getters = new();
    private static readonly ConcurrentDictionary<(Type, string), Type?> Types = new();

    public static Type? GetFieldType(Type itemType, string path) =>
        Types.GetOrAdd((itemType, path), key =>
        {
            Type? type = key.Item1;
            foreach (var part in key.Item2.Split('.'))
            {
                var property = type?.GetProperty(part, BindingFlags.Public | BindingFlags.Instance);
                if (property is null) return null;
                type = property.PropertyType;
            }
            return type;
        });

    public static object? GetValue(object item, string path) =>
        Getters.GetOrAdd((item.GetType(), path), key =>
        {
            var parameter = Expression.Parameter(typeof(object), "item");
            var body = BuildNullSafe(Expression.Convert(parameter, key.Item1), key.Item2);
            return Expression.Lambda<Func<object, object?>>(Expression.Convert(body, typeof(object)), parameter).Compile();
        })(item);

    public static bool CanWrite(Type itemType, string path)
    {
        var property = Resolve(itemType, path).Property;
        return property is { CanWrite: true } && property.SetMethod?.IsPublic == true;
    }

    public static void SetValue(object item, string path, object? value)
    {
        var (owner, property) = ResolveOwner(item, path);
        if (owner is null || property is null) return;
        property.SetValue(owner, ConvertTo(value, property.PropertyType));
    }

    /// <summary>The member expression for <paramref name="path"/> on <paramref name="item"/>.</summary>
    public static Expression Member(Expression item, string path)
    {
        Expression current = item;
        foreach (var part in path.Split('.')) current = Expression.PropertyOrField(current, part);
        return current;
    }

    /// <summary>Converts user input (often a string from an editor) to <paramref name="type"/>.</summary>
    public static object? ConvertTo(object? value, Type type)
    {
        var target = Nullable.GetUnderlyingType(type) ?? type;
        if (value is null || (value is string s && string.IsNullOrWhiteSpace(s) && target != typeof(string)))
            return type.IsValueType && Nullable.GetUnderlyingType(type) is null ? Activator.CreateInstance(type) : null;
        if (target.IsInstanceOfType(value)) return value;
        if (target.IsEnum) return value is string text ? Enum.Parse(target, text, ignoreCase: true) : Enum.ToObject(target, value);
        if (target == typeof(DateOnly) && value is DateTime dt) return DateOnly.FromDateTime(dt);
        if (target == typeof(DateTime) && value is DateOnly d) return d.ToDateTime(TimeOnly.MinValue);
        if (value is string str)
        {
            var converter = TypeDescriptor.GetConverter(target);
            if (converter.CanConvertFrom(typeof(string))) return converter.ConvertFromString(null, CultureInfo.CurrentCulture, str);
        }
        return System.Convert.ChangeType(value, target, CultureInfo.CurrentCulture);
    }

    public static bool TryConvertTo(object? value, Type type, out object? result)
    {
        try
        {
            result = ConvertTo(value, type);
            return true;
        }
        catch (Exception e) when (e is FormatException or InvalidCastException or ArgumentException or OverflowException or NotSupportedException)
        {
            result = null;
            return false;
        }
    }

    public static bool IsNumeric(Type? type)
    {
        var t = type is null ? null : Nullable.GetUnderlyingType(type) ?? type;
        return t == typeof(int) || t == typeof(long) || t == typeof(short) || t == typeof(byte) || t == typeof(decimal) ||
               t == typeof(double) || t == typeof(float) || t == typeof(uint) || t == typeof(ulong) || t == typeof(ushort);
    }

    public static bool IsDate(Type? type)
    {
        var t = type is null ? null : Nullable.GetUnderlyingType(type) ?? type;
        return t == typeof(DateTime) || t == typeof(DateTimeOffset) || t == typeof(DateOnly);
    }

    public static bool IsBool(Type? type) => (type is null ? null : Nullable.GetUnderlyingType(type) ?? type) == typeof(bool);

    // Null-safe chain: item.A?.B?.C, so a null link yields null instead of throwing (in-memory reads).
    private static Expression BuildNullSafe(Expression item, string path)
    {
        var parts = path.Split('.');
        Expression current = item;
        Expression? guard = null;
        for (var i = 0; i < parts.Length; i++)
        {
            current = Expression.PropertyOrField(current, parts[i]);
            if (i < parts.Length - 1 && !current.Type.IsValueType)
            {
                var notNull = Expression.NotEqual(current, Expression.Constant(null, current.Type));
                guard = guard is null ? notNull : Expression.AndAlso(guard, notNull);
            }
        }
        if (guard is null) return current;
        var resultType = current.Type.IsValueType && Nullable.GetUnderlyingType(current.Type) is null
            ? typeof(Nullable<>).MakeGenericType(current.Type)
            : current.Type;
        return Expression.Condition(guard, Expression.Convert(current, resultType), Expression.Constant(null, resultType));
    }

    private static (Type? Owner, PropertyInfo? Property) Resolve(Type itemType, string path)
    {
        Type? type = itemType;
        PropertyInfo? property = null;
        foreach (var part in path.Split('.'))
        {
            property = type?.GetProperty(part, BindingFlags.Public | BindingFlags.Instance);
            if (property is null) return (null, null);
            type = property.PropertyType;
        }
        return (type, property);
    }

    private static (object? Owner, PropertyInfo? Property) ResolveOwner(object item, string path)
    {
        var parts = path.Split('.');
        object? owner = item;
        for (var i = 0; i < parts.Length - 1 && owner is not null; i++)
            owner = owner.GetType().GetProperty(parts[i], BindingFlags.Public | BindingFlags.Instance)?.GetValue(owner);
        return owner is null ? (null, null) : (owner, owner.GetType().GetProperty(parts[^1], BindingFlags.Public | BindingFlags.Instance));
    }
}
