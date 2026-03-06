using System.Runtime.InteropServices;

namespace EricWategay.Api.Runtime.Native;

public sealed class EricNativeLibraryLoader : IDisposable
{
    private readonly object gate = new();
    private IntPtr handle = IntPtr.Zero;
    private string? loadedFrom;

    public bool TryEnsureLoaded(string libPath, out string? resolvedPath, out string? errorMessage)
    {
        lock (gate)
        {
            if (handle != IntPtr.Zero)
            {
                resolvedPath = loadedFrom;
                errorMessage = null;
                return true;
            }

            var candidates = ResolveCandidates(libPath).ToArray();
            if (candidates.Length == 0)
            {
                resolvedPath = null;
                errorMessage = $"No ERiC library candidates found at path '{libPath}'";
                return false;
            }

            foreach (var candidate in candidates)
            {
                if (!File.Exists(candidate))
                {
                    continue;
                }

                if (NativeLibrary.TryLoad(candidate, out var loadedHandle))
                {
                    handle = loadedHandle;
                    loadedFrom = candidate;
                    resolvedPath = loadedFrom;
                    errorMessage = null;
                    return true;
                }
            }

            resolvedPath = null;
            errorMessage = $"Failed to load ERiC native library from '{libPath}'";
            return false;
        }
    }

    private static IEnumerable<string> ResolveCandidates(string libPath)
    {
        if (string.IsNullOrWhiteSpace(libPath))
        {
            yield break;
        }

        if (File.Exists(libPath))
        {
            yield return libPath;
            yield break;
        }

        if (!Directory.Exists(libPath))
        {
            yield break;
        }

        var names = new[] { "libericapi.so", "libericapi.dylib", "ericapi.dll" };
        foreach (var name in names)
        {
            yield return Path.Combine(libPath, name);
        }
    }

    public void Dispose()
    {
        lock (gate)
        {
            if (handle == IntPtr.Zero)
            {
                return;
            }

            NativeLibrary.Free(handle);
            handle = IntPtr.Zero;
            loadedFrom = null;
        }
    }
}
