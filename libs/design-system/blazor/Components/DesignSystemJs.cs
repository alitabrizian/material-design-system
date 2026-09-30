using System.Runtime.CompilerServices;
using Microsoft.JSInterop;

namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>
/// Lazily imports <c>_content/PartoBita.DesignSystem.Blazor/design-system.js</c> once per JS runtime (per circuit on Blazor
/// Server, once on WebAssembly) and exposes the helpers the components need. Every call is a no-op
/// while prerendering, when no JS runtime is available yet.
/// </summary>
internal static class DesignSystemJs
{
    private const string ModulePath = "./_content/PartoBita.DesignSystem.Blazor/design-system.js";

    private static readonly ConditionalWeakTable<IJSRuntime, Task<IJSObjectReference>> Modules = new();

    private static Task<IJSObjectReference> ModuleAsync(IJSRuntime js) =>
        Modules.GetValue(js, runtime => runtime.InvokeAsync<IJSObjectReference>("import", ModulePath).AsTask());

    public static async ValueTask InvokeVoidAsync(IJSRuntime js, string identifier, params object?[] args)
    {
        try
        {
            var module = await ModuleAsync(js);
            await module.InvokeVoidAsync(identifier, args);
        }
        catch (JSDisconnectedException)
        {
            // Circuit gone (page closed); nothing left to update.
        }
        catch (InvalidOperationException)
        {
            // Prerendering: JS interop is not available until the component is interactive.
        }
        catch (TaskCanceledException)
        {
        }
    }

    public static async ValueTask<T?> InvokeAsync<T>(IJSRuntime js, string identifier, params object?[] args)
    {
        try
        {
            var module = await ModuleAsync(js);
            return await module.InvokeAsync<T>(identifier, args);
        }
        catch (Exception e) when (e is JSDisconnectedException or InvalidOperationException or TaskCanceledException)
        {
            return default;
        }
    }
}
