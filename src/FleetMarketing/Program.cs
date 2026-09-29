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

// The live demo's recording (wwwroot/casts/*.cast) has no default content type, so it would 404.
var contentTypes = new Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider();
contentTypes.Mappings[".cast"] = "application/x-asciicast";

app.UseStaticFiles(new StaticFileOptions
{
    ContentTypeProvider = contentTypes,
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
