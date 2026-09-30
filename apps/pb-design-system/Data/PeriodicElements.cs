namespace Design.Demo.Data;

/// <summary>The sample data set Angular Material's table, sort and paginator examples use.</summary>
public sealed record PeriodicElement(int Position, string Name, double Weight, string Symbol);

public static class PeriodicElements
{
    public static readonly IReadOnlyList<PeriodicElement> All =
    [
        new(1, "Hydrogen", 1.0079, "H"),
        new(2, "Helium", 4.0026, "He"),
        new(3, "Lithium", 6.941, "Li"),
        new(4, "Beryllium", 9.0122, "Be"),
        new(5, "Boron", 10.811, "B"),
        new(6, "Carbon", 12.0107, "C"),
        new(7, "Nitrogen", 14.0067, "N"),
        new(8, "Oxygen", 15.9994, "O"),
        new(9, "Fluorine", 18.9984, "F"),
        new(10, "Neon", 20.1797, "Ne"),
        new(11, "Sodium", 22.9897, "Na"),
        new(12, "Magnesium", 24.305, "Mg"),
        new(13, "Aluminum", 26.9815, "Al"),
        new(14, "Silicon", 28.0855, "Si"),
        new(15, "Phosphorus", 30.9738, "P"),
        new(16, "Sulfur", 32.065, "S"),
        new(17, "Chlorine", 35.453, "Cl"),
        new(18, "Argon", 39.948, "Ar"),
        new(19, "Potassium", 39.0983, "K"),
        new(20, "Calcium", 40.078, "Ca"),
    ];
}
