using System.Globalization;
using System.Linq.Expressions;
using System.Reflection;

namespace PartoBita.DesignSystem.Blazor.Components;

public enum PBGridFilterOperator
{
    Contains,
    DoesNotContain,
    StartsWith,
    EndsWith,
    Equals,
    NotEquals,
    Less,
    LessOrEqual,
    Greater,
    GreaterOrEqual,
    IsBlank,
    IsNotBlank,
}

/// <summary>What the grid knows about a field while it evaluates a filter in memory.</summary>
internal interface IGridFieldSource
{
    Type? FieldType(string field);

    object? Value(object item, string field);

    /// <summary>The cell's display text (the search box matches what the user sees).</summary>
    string DisplayText(object item, string field);
}

/// <summary>
/// A filter criteria tree: conditions on one field, value lists, and AND/OR groups. The filter row,
/// column filter menus, filter builder, search box and filter API all produce these; the grid
/// combines them with AND. In memory they are evaluated directly (so unbound columns filter too);
/// on an <see cref="IQueryable{T}"/> they compile to one LINQ expression (SQL with Entity Framework).
/// </summary>
public abstract record PBGridFilter
{
    public static PBGridFilter Condition(string field, PBGridFilterOperator op, object? value = null) => new PBGridConditionFilter(field, op, value);

    public static PBGridFilter In(string field, IEnumerable<object?> values) => new PBGridInFilter(field, values.ToList());

    /// <summary>AND of the non-null filters (null when none are left).</summary>
    public static PBGridFilter? And(params PBGridFilter?[] filters) => Group(false, filters);

    /// <summary>OR of the non-null filters (null when none are left).</summary>
    public static PBGridFilter? Or(params PBGridFilter?[] filters) => Group(true, filters);

    private static PBGridFilter? Group(bool isOr, PBGridFilter?[] filters)
    {
        var list = filters.Where(f => f is not null).Cast<PBGridFilter>().ToList();
        return list.Count switch
        {
            0 => null,
            1 => list[0],
            _ => new PBGridGroupFilter(isOr, list),
        };
    }

    /// <summary>Readable form for the filter panel, e.g. <c>[Status] In ('New', 'Fixed') And [Priority] = 'High'</c>.</summary>
    public abstract string ToDisplayText(Func<string, string> caption);

    /// <summary>The fields this filter reads.</summary>
    public abstract IEnumerable<string> Fields { get; }

    internal abstract bool Matches(object item, IGridFieldSource source);

    internal abstract Expression? Build(Expression item, Type itemType);

    /// <summary>A predicate for <typeparamref name="TItem"/> (null when the filter is empty).</summary>
    public Expression<Func<TItem, bool>>? ToExpression<TItem>()
    {
        var parameter = Expression.Parameter(typeof(TItem), "item");
        var body = Build(parameter, typeof(TItem));
        return body is null ? null : Expression.Lambda<Func<TItem, bool>>(body, parameter);
    }

    internal static string FormatValue(object? value) => value switch
    {
        null => "null",
        string s => $"'{s}'",
        DateTime d => $"#{d.ToString(d.TimeOfDay == TimeSpan.Zero ? "d" : "g", CultureInfo.CurrentCulture)}#",
        DateOnly d => $"#{d.ToString("d", CultureInfo.CurrentCulture)}#",
        bool b => b ? "True" : "False",
        Enum e => $"'{e}'",
        IFormattable f => f.ToString(null, CultureInfo.CurrentCulture),
        _ => $"'{value}'",
    };

    public static string OperatorText(PBGridFilterOperator op) => op switch
    {
        PBGridFilterOperator.Contains => "Contains",
        PBGridFilterOperator.DoesNotContain => "Does not contain",
        PBGridFilterOperator.StartsWith => "Begins with",
        PBGridFilterOperator.EndsWith => "Ends with",
        PBGridFilterOperator.Equals => "Equals",
        PBGridFilterOperator.NotEquals => "Does not equal",
        PBGridFilterOperator.Less => "Is less than",
        PBGridFilterOperator.LessOrEqual => "Is less than or equal to",
        PBGridFilterOperator.Greater => "Is greater than",
        PBGridFilterOperator.GreaterOrEqual => "Is greater than or equal to",
        PBGridFilterOperator.IsBlank => "Is blank",
        PBGridFilterOperator.IsNotBlank => "Is not blank",
        _ => op.ToString(),
    };

    internal static string OperatorSymbol(PBGridFilterOperator op) => op switch
    {
        PBGridFilterOperator.Equals => "=",
        PBGridFilterOperator.NotEquals => "<>",
        PBGridFilterOperator.Less => "<",
        PBGridFilterOperator.LessOrEqual => "<=",
        PBGridFilterOperator.Greater => ">",
        PBGridFilterOperator.GreaterOrEqual => ">=",
        _ => OperatorText(op),
    };

    /// <summary>Operators that make sense for a field of <paramref name="type"/>.</summary>
    public static IReadOnlyList<PBGridFilterOperator> OperatorsFor(Type? type)
    {
        if (type == typeof(string))
            return [PBGridFilterOperator.Contains, PBGridFilterOperator.DoesNotContain, PBGridFilterOperator.StartsWith, PBGridFilterOperator.EndsWith,
                    PBGridFilterOperator.Equals, PBGridFilterOperator.NotEquals, PBGridFilterOperator.IsBlank, PBGridFilterOperator.IsNotBlank];
        if (GridField.IsBool(type) || (type is not null && (Nullable.GetUnderlyingType(type) ?? type).IsEnum))
            return [PBGridFilterOperator.Equals, PBGridFilterOperator.NotEquals, PBGridFilterOperator.IsBlank, PBGridFilterOperator.IsNotBlank];
        return [PBGridFilterOperator.Equals, PBGridFilterOperator.NotEquals, PBGridFilterOperator.Less, PBGridFilterOperator.LessOrEqual,
                PBGridFilterOperator.Greater, PBGridFilterOperator.GreaterOrEqual, PBGridFilterOperator.IsBlank, PBGridFilterOperator.IsNotBlank];
    }

    internal static bool IsDay(object? value) => value is DateTime d && d.TimeOfDay == TimeSpan.Zero;
}

public sealed record PBGridConditionFilter(string Field, PBGridFilterOperator Operator, object? Value) : PBGridFilter
{
    public override IEnumerable<string> Fields => [Field];

    public override string ToDisplayText(Func<string, string> caption) =>
        Operator is PBGridFilterOperator.IsBlank or PBGridFilterOperator.IsNotBlank
            ? $"[{caption(Field)}] {OperatorText(Operator)}"
            : $"[{caption(Field)}] {OperatorSymbol(Operator)} {FormatValue(Value)}";

    internal override bool Matches(object item, IGridFieldSource source)
    {
        var fieldType = source.FieldType(Field);
        if (fieldType is null) return true;
        var value = source.Value(item, Field);

        if (Operator is PBGridFilterOperator.IsBlank or PBGridFilterOperator.IsNotBlank)
        {
            var blank = value is null || value is string { Length: 0 };
            return Operator == PBGridFilterOperator.IsBlank ? blank : !blank;
        }

        if (Operator is PBGridFilterOperator.Contains or PBGridFilterOperator.DoesNotContain or PBGridFilterOperator.StartsWith or PBGridFilterOperator.EndsWith)
        {
            var text = Convert.ToString(Value, CultureInfo.CurrentCulture) ?? "";
            if (fieldType != typeof(string))
            {
                var equal = GridField.TryConvertTo(text, fieldType, out var parsed) && parsed is not null && Same(value, parsed);
                return Operator == PBGridFilterOperator.DoesNotContain ? !equal : equal;
            }
            var s = value as string;
            var match = s is not null && Operator switch
            {
                PBGridFilterOperator.StartsWith => s.StartsWith(text, StringComparison.CurrentCultureIgnoreCase),
                PBGridFilterOperator.EndsWith => s.EndsWith(text, StringComparison.CurrentCultureIgnoreCase),
                _ => s.Contains(text, StringComparison.CurrentCultureIgnoreCase),
            };
            return Operator == PBGridFilterOperator.DoesNotContain ? !match : match;
        }

        if (!GridField.TryConvertTo(Value, fieldType, out var target)) return false;
        if (Operator is PBGridFilterOperator.Equals) return Same(value, target);
        if (Operator is PBGridFilterOperator.NotEquals) return !Same(value, target);
        if (value is null || target is null) return false;
        if (value is DateTime dt && IsDay(target)) value = dt.Date;
        var compare = value is string a && target is string b
            ? string.Compare(a, b, StringComparison.CurrentCultureIgnoreCase)
            : System.Collections.Comparer.Default.Compare(value, target);
        return Operator switch
        {
            PBGridFilterOperator.Less => compare < 0,
            PBGridFilterOperator.LessOrEqual => compare <= 0,
            PBGridFilterOperator.Greater => compare > 0,
            _ => compare >= 0,
        };
    }

    /// <summary>Equality as the user means it: strings ignore case, a date matches its whole day.</summary>
    internal static bool Same(object? value, object? target)
    {
        if (value is null || target is null) return value is null && target is null;
        if (value is string a && target is string b) return string.Equals(a, b, StringComparison.CurrentCultureIgnoreCase);
        if (value is DateTime d && IsDay(target)) return d.Date == (DateTime)target;
        return value.Equals(target);
    }

    internal override Expression? Build(Expression item, Type itemType)
    {
        var fieldType = GridField.GetFieldType(itemType, Field);
        if (fieldType is null) return null;
        var member = GridField.Member(item, Field);

        if (Operator is PBGridFilterOperator.IsBlank or PBGridFilterOperator.IsNotBlank)
        {
            Expression blank = fieldType == typeof(string)
                ? Expression.Call(typeof(string).GetMethod(nameof(string.IsNullOrEmpty), [typeof(string)])!, member)
                : fieldType.IsValueType && Nullable.GetUnderlyingType(fieldType) is null
                    ? Expression.Constant(false)
                    : Expression.Equal(member, Expression.Constant(null, fieldType));
            return Operator == PBGridFilterOperator.IsBlank ? blank : Expression.Not(blank);
        }

        if (Operator is PBGridFilterOperator.Contains or PBGridFilterOperator.DoesNotContain or PBGridFilterOperator.StartsWith or PBGridFilterOperator.EndsWith)
        {
            var text = Convert.ToString(Value, CultureInfo.CurrentCulture) ?? "";
            if (fieldType != typeof(string))
            {
                // Text operators on numbers/dates fall back to equality when the text parses.
                return GridField.TryConvertTo(text, fieldType, out var parsed) && parsed is not null
                    ? Compare(member, fieldType, Operator == PBGridFilterOperator.DoesNotContain ? PBGridFilterOperator.NotEquals : PBGridFilterOperator.Equals, parsed)
                    : Expression.Constant(Operator == PBGridFilterOperator.DoesNotContain);
            }
            return TextMatch(member, Operator, text);
        }

        return GridField.TryConvertTo(Value, fieldType, out var converted)
            ? Compare(member, fieldType, Operator, converted)
            : Expression.Constant(false);
    }

    internal static Expression TextMatch(Expression member, PBGridFilterOperator op, string text)
    {
        var method = op switch
        {
            PBGridFilterOperator.StartsWith => nameof(string.StartsWith),
            PBGridFilterOperator.EndsWith => nameof(string.EndsWith),
            _ => nameof(string.Contains),
        };
        var lower = Expression.Call(member, typeof(string).GetMethod(nameof(string.ToLower), Type.EmptyTypes)!);
        var call = Expression.Call(lower, typeof(string).GetMethod(method, [typeof(string)])!, Expression.Constant(text.ToLowerInvariant()));
        var match = Expression.AndAlso(Expression.NotEqual(member, Expression.Constant(null, typeof(string))), call);
        return op == PBGridFilterOperator.DoesNotContain ? Expression.Not(match) : match;
    }

    internal static Expression Compare(Expression member, Type fieldType, PBGridFilterOperator op, object? value)
    {
        if (fieldType == typeof(string))
        {
            var right = Expression.Constant(value, typeof(string));
            if (op is PBGridFilterOperator.Equals or PBGridFilterOperator.NotEquals)
            {
                var lower = typeof(string).GetMethod(nameof(string.ToLower), Type.EmptyTypes)!;
                var eq = value is null
                    ? (Expression)Expression.Equal(member, right)
                    : Expression.AndAlso(Expression.NotEqual(member, Expression.Constant(null, typeof(string))),
                        Expression.Equal(Expression.Call(member, lower), Expression.Constant(((string)value).ToLowerInvariant())));
                return op == PBGridFilterOperator.NotEquals ? Expression.Not(eq) : eq;
            }
            var compare = Expression.Call(typeof(string).GetMethod(nameof(string.Compare), [typeof(string), typeof(string)])!, member, right);
            return Relational(op, compare, Expression.Constant(0));
        }

        var underlying = Nullable.GetUnderlyingType(fieldType) ?? fieldType;
        if (underlying == typeof(DateTime) && IsDay(value) && op is PBGridFilterOperator.Equals or PBGridFilterOperator.NotEquals or PBGridFilterOperator.LessOrEqual or PBGridFilterOperator.Greater)
        {
            // A whole day: [d, d + 1). "<= d" means "< d + 1" and "> d" means ">= d + 1".
            var day = (DateTime)value!;
            var from = Expression.Constant(day, fieldType);
            var to = Expression.Constant(day.AddDays(1), fieldType);
            return op switch
            {
                PBGridFilterOperator.Equals => Expression.AndAlso(Expression.GreaterThanOrEqual(member, from), Expression.LessThan(member, to)),
                PBGridFilterOperator.NotEquals => Expression.Not(Expression.AndAlso(Expression.GreaterThanOrEqual(member, from), Expression.LessThan(member, to))),
                PBGridFilterOperator.LessOrEqual => Expression.LessThan(member, to),
                _ => Expression.GreaterThanOrEqual(member, to),
            };
        }
        Expression left = member;
        Expression constant = Expression.Constant(value, fieldType);
        if (underlying.IsEnum)
        {
            // Enums have no relational operators in expression trees; compare their numbers.
            var numeric = typeof(Nullable<>).MakeGenericType(Enum.GetUnderlyingType(underlying));
            left = Expression.Convert(member, numeric);
            constant = Expression.Convert(constant, numeric);
        }
        return Relational(op, left, constant);
    }

    private static Expression Relational(PBGridFilterOperator op, Expression left, Expression right) => op switch
    {
        PBGridFilterOperator.NotEquals => Expression.NotEqual(left, right),
        PBGridFilterOperator.Less => Expression.LessThan(left, right),
        PBGridFilterOperator.LessOrEqual => Expression.LessThanOrEqual(left, right),
        PBGridFilterOperator.Greater => Expression.GreaterThan(left, right),
        PBGridFilterOperator.GreaterOrEqual => Expression.GreaterThanOrEqual(left, right),
        _ => Expression.Equal(left, right),
    };
}

public sealed record PBGridInFilter(string Field, IReadOnlyList<object?> Values) : PBGridFilter
{
    public override IEnumerable<string> Fields => [Field];

    public override string ToDisplayText(Func<string, string> caption) =>
        $"[{caption(Field)}] In ({string.Join(", ", Values.Select(FormatValue))})";

    internal override bool Matches(object item, IGridFieldSource source)
    {
        var fieldType = source.FieldType(Field);
        if (fieldType is null) return true;
        var value = source.Value(item, Field);
        foreach (var candidate in Values)
        {
            if (candidate is null)
            {
                if (value is null) return true;
                continue;
            }
            if (GridField.TryConvertTo(candidate, fieldType, out var target) && PBGridConditionFilter.Same(value, target)) return true;
        }
        return false;
    }

    internal override Expression? Build(Expression item, Type itemType)
    {
        var fieldType = GridField.GetFieldType(itemType, Field);
        if (fieldType is null) return null;
        if (Values.Count == 0) return Expression.Constant(false);
        var member = GridField.Member(item, Field);
        Expression? any = null;
        foreach (var value in Values)
        {
            Expression test = value is null
                ? (fieldType.IsValueType && Nullable.GetUnderlyingType(fieldType) is null ? Expression.Constant(false) : Expression.Equal(member, Expression.Constant(null, fieldType)))
                : GridField.TryConvertTo(value, fieldType, out var converted)
                    ? PBGridConditionFilter.Compare(member, fieldType, PBGridFilterOperator.Equals, converted)
                    : Expression.Constant(false);
            any = any is null ? test : Expression.OrElse(any, test);
        }
        return any;
    }
}

public sealed record PBGridGroupFilter(bool IsOr, IReadOnlyList<PBGridFilter> Filters) : PBGridFilter
{
    public override IEnumerable<string> Fields => Filters.SelectMany(f => f.Fields).Distinct();

    public override string ToDisplayText(Func<string, string> caption)
    {
        var parts = Filters.Select(f => f is PBGridGroupFilter { Filters.Count: > 1 } ? $"({f.ToDisplayText(caption)})" : f.ToDisplayText(caption));
        return string.Join(IsOr ? " Or " : " And ", parts);
    }

    internal override bool Matches(object item, IGridFieldSource source) =>
        Filters.Count == 0 || (IsOr ? Filters.Any(f => f.Matches(item, source)) : Filters.All(f => f.Matches(item, source)));

    internal override Expression? Build(Expression item, Type itemType)
    {
        Expression? result = null;
        foreach (var filter in Filters)
        {
            var part = filter.Build(item, itemType);
            if (part is null) continue;
            result = result is null ? part : IsOr ? Expression.OrElse(result, part) : Expression.AndAlso(result, part);
        }
        return result;
    }
}

/// <summary>
/// Search box: every word of the text appears in some searchable column. In memory it matches the
/// display text (what the user sees); on a query, text columns use Contains and numbers equality.
/// </summary>
internal sealed record GridSearchFilter(string Text, IReadOnlyList<(string Field, Type Type)> SearchFields) : PBGridFilter
{
    public IReadOnlyList<string> Words { get; } = Text.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    public override IEnumerable<string> Fields => SearchFields.Select(f => f.Field);

    public override string ToDisplayText(Func<string, string> caption) => $"Search '{Text}'";

    internal override bool Matches(object item, IGridFieldSource source)
    {
        if (Words.Count == 0) return true;
        var texts = SearchFields.Select(f => source.DisplayText(item, f.Field)).ToList();
        return Words.All(word => texts.Any(t => t.Contains(word, StringComparison.CurrentCultureIgnoreCase)));
    }

    internal override Expression? Build(Expression item, Type itemType)
    {
        Expression? all = null;
        foreach (var word in Words)
        {
            Expression? any = null;
            foreach (var (field, type) in SearchFields)
            {
                if (GridField.GetFieldType(itemType, field) is null) continue;
                var member = GridField.Member(item, field);
                var underlying = Nullable.GetUnderlyingType(type) ?? type;
                Expression? test = type == typeof(string)
                    ? PBGridConditionFilter.TextMatch(member, PBGridFilterOperator.Contains, word)
                    : (GridField.IsNumeric(type) || underlying.IsEnum) && GridField.TryConvertTo(word, type, out var parsed) && parsed is not null
                        ? PBGridConditionFilter.Compare(member, type, PBGridFilterOperator.Equals, parsed)
                        : null;
                if (test is not null) any = any is null ? test : Expression.OrElse(any, test);
            }
            var part = any ?? Expression.Constant(false);
            all = all is null ? part : Expression.AndAlso(all, part);
        }
        return all;
    }
}

internal static class GridQueryable
{
    private static MethodInfo QueryableMethod(string name) =>
        typeof(Queryable).GetMethods().First(m => m.Name == name && m.GetParameters().Length == 2
            && m.GetParameters()[1].ParameterType.IsGenericType
            && m.GetParameters()[1].ParameterType.GetGenericArguments()[0].GetGenericArguments().Length == 2);

    private static readonly MethodInfo OrderByMethod = QueryableMethod(nameof(Queryable.OrderBy));
    private static readonly MethodInfo OrderByDescendingMethod = QueryableMethod(nameof(Queryable.OrderByDescending));
    private static readonly MethodInfo ThenByMethod = QueryableMethod(nameof(Queryable.ThenBy));
    private static readonly MethodInfo ThenByDescendingMethod = QueryableMethod(nameof(Queryable.ThenByDescending));
    private static readonly MethodInfo SelectMethod = QueryableMethod(nameof(Queryable.Select));

    public static IQueryable<T> Sort<T>(IQueryable<T> query, IEnumerable<(string Field, PBGridSortOrder Order)> sort)
    {
        var first = true;
        foreach (var (field, order) in sort)
        {
            if (order == PBGridSortOrder.None || GridField.GetFieldType(typeof(T), field) is null) continue;
            var parameter = Expression.Parameter(typeof(T), "item");
            var member = GridField.Member(parameter, field);
            var lambda = Expression.Lambda(member, parameter);
            var method = (first, order) switch
            {
                (true, PBGridSortOrder.Ascending) => OrderByMethod,
                (true, _) => OrderByDescendingMethod,
                (false, PBGridSortOrder.Ascending) => ThenByMethod,
                _ => ThenByDescendingMethod,
            };
            query = (IQueryable<T>)method.MakeGenericMethod(typeof(T), member.Type).Invoke(null, [query, lambda])!;
            first = false;
        }
        return query;
    }

    /// <summary>Sum/Min/Max/Average of a field over a query (server-side for EF).</summary>
    public static object? Aggregate<T>(IQueryable<T> query, string field, PBGridSummaryType type)
    {
        var fieldType = GridField.GetFieldType(typeof(T), field);
        if (fieldType is null) return null;
        var parameter = Expression.Parameter(typeof(T), "item");
        var member = GridField.Member(parameter, field);
        if (type is PBGridSummaryType.Min or PBGridSummaryType.Max)
        {
            if (!query.Any()) return null;
            var projected = (IQueryable)SelectMethod.MakeGenericMethod(typeof(T), member.Type).Invoke(null, [query, Expression.Lambda(member, parameter)])!;
            var method = typeof(Queryable).GetMethods()
                .First(m => m.Name == (type == PBGridSummaryType.Min ? nameof(Queryable.Min) : nameof(Queryable.Max)) && m.GetParameters().Length == 1 && m.IsGenericMethodDefinition)
                .MakeGenericMethod(member.Type);
            return method.Invoke(null, [projected]);
        }
        if (!GridField.IsNumeric(fieldType)) return null;
        var asDecimal = Expression.Lambda<Func<T, decimal?>>(Expression.Convert(member, typeof(decimal?)), parameter);
        return type == PBGridSummaryType.Sum ? query.Sum(asDecimal) : query.Average(asDecimal);
    }

    /// <summary>Distinct values of a field (filter menu), at most <paramref name="max"/>.</summary>
    public static List<object?> Distinct<T>(IQueryable<T> query, string field, int max)
    {
        if (GridField.GetFieldType(typeof(T), field) is null) return [];
        var parameter = Expression.Parameter(typeof(T), "item");
        var member = GridField.Member(parameter, field);
        var projected = (IQueryable)SelectMethod.MakeGenericMethod(typeof(T), member.Type).Invoke(null, [query, Expression.Lambda(member, parameter)])!;
        var distinct = typeof(Queryable).GetMethods().First(m => m.Name == nameof(Queryable.Distinct) && m.GetParameters().Length == 1).MakeGenericMethod(member.Type);
        var take = typeof(Queryable).GetMethods().First(m => m.Name == nameof(Queryable.Take) && m.GetParameters()[1].ParameterType == typeof(int)).MakeGenericMethod(member.Type);
        var limited = (IQueryable)take.Invoke(null, [distinct.Invoke(null, [projected]), max])!;
        return limited.Cast<object?>().ToList();
    }
}
