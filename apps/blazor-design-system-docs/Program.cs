using PartoBita.DesignSystem.Docs;
using PartoBita.DesignSystem.Docs.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();
// Scoped = one per circuit (per browser tab). A singleton would share one theme across every user.
builder.Services.AddScoped<ThemeState>();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/error");
    app.UseHsts();
}

app.UseHttpsRedirection();

if (app.Environment.IsDevelopment())
{
    // Without an explicit Cache-Control header, browsers apply heuristic
    // caching (based on Last-Modified) and can silently serve a stale copy of
    // app.css/etc. from disk cache with zero network request -- even in a
    // fresh incognito window that previously loaded the page. Force
    // revalidation on every request in dev so CSS/JS edits are never masked
    // by this. Production still gets normal caching for real deploys.
    app.UseStaticFiles(new StaticFileOptions
    {
        OnPrepareResponse = ctx =>
            ctx.Context.Response.Headers.CacheControl = "no-cache",
    });
}
else
{
    app.UseStaticFiles();
}
app.UseAntiforgery();
app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
