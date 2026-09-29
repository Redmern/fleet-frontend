using FleetMarketing.Components;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorComponents();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();

app.UseStaticFiles(new StaticFileOptions
{
    // In development, make the browser revalidate CSS/JS on every load so edits show up
    // without a hard refresh (otherwise it heuristically caches app.css and serves it stale).
    OnPrepareResponse = ctx =>
    {
        if (app.Environment.IsDevelopment())
            ctx.Context.Response.Headers.CacheControl = "no-cache";
    }
});
app.UseAntiforgery();

app.MapRazorComponents<App>();

app.Run();

// Exposed so FleetMarketing.Ssg can host this app in-memory via WebApplicationFactory<Program>
// to render its static-SSR output to plain HTML files. See REPORT.md for why.
public partial class Program;
