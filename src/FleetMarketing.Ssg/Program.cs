// Static-site exporter for FleetMarketing.
//
// FleetMarketing is a Blazor Web App using only static server-side rendering
// (no interactive render mode is registered in Program.cs), so every route
// renders to plain HTML with no client runtime required. This tool boots that
// app in-memory via WebApplicationFactory<Program>, requests each route, and
// writes the resulting HTML plus the app's wwwroot assets to a `dist` folder
// that can be served by any static host (GitHub Pages). See REPORT.md for
// why this approach was chosen over Blazor WebAssembly or a hosted server.
//
// This file uses an explicit Main (rather than top-level statements) because
// top-level statements would generate their own type named `Program`, which
// collides with the `Program` type imported from the referenced FleetMarketing
// assembly that WebApplicationFactory<Program> below needs to resolve.

using System.Runtime.CompilerServices;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace FleetMarketing.Ssg;

internal static class SiteExporter
{
    private static async Task Main(string[] args)
    {
        var outputDir = args.Length > 0
            ? Path.GetFullPath(args[0])
            : Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "dist"));

        if (Directory.Exists(outputDir))
        {
            Directory.Delete(outputDir, recursive: true);
        }
        Directory.CreateDirectory(outputDir);

        // WebApplicationFactory guesses the content root from the current working
        // directory + entry assembly name, which breaks when this tool isn't run
        // from its own project folder (e.g. `dotnet run --project`). Pin it to the
        // FleetMarketing *source* directory (sibling of this project) instead of
        // the bin output — bin output has no physical wwwroot folder since .NET's
        // static web assets feature only maps it via a manifest at that location.
        var contentRoot = Path.GetFullPath(Path.Combine(ThisFileDirectory(), "..", "FleetMarketing"));

        await using var factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder => builder.UseContentRoot(contentRoot));
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            // Avoid the app's UseHttpsRedirection() middleware bouncing the initial
            // request — TestServer requests default to the http scheme otherwise.
            BaseAddress = new Uri("https://localhost"),
        });

        string[] routes = ["/"];

        foreach (var route in routes)
        {
            var html = await client.GetStringAsync(route);
            var relativePath = route == "/" ? "index.html" : Path.Combine(route.Trim('/'), "index.html");
            var filePath = Path.Combine(outputDir, relativePath);
            Directory.CreateDirectory(Path.GetDirectoryName(filePath)!);
            await File.WriteAllTextAsync(filePath, html);
            Console.WriteLine($"Rendered {route} -> {Path.GetRelativePath(outputDir, filePath)}");
        }

        var webRootPath = factory.Services.GetRequiredService<IWebHostEnvironment>().WebRootPath;
        CopyDirectory(webRootPath, outputDir);
        Console.WriteLine($"Copied static assets from {webRootPath}");
        Console.WriteLine($"Static site exported to {outputDir}");
    }

    private static string ThisFileDirectory([CallerFilePath] string path = "") => Path.GetDirectoryName(path)!;

    private static void CopyDirectory(string sourceDir, string destinationDir)
    {
        foreach (var dirPath in Directory.GetDirectories(sourceDir, "*", SearchOption.AllDirectories))
        {
            Directory.CreateDirectory(dirPath.Replace(sourceDir, destinationDir));
        }

        foreach (var filePath in Directory.GetFiles(sourceDir, "*", SearchOption.AllDirectories))
        {
            File.Copy(filePath, filePath.Replace(sourceDir, destinationDir), overwrite: true);
        }
    }
}
