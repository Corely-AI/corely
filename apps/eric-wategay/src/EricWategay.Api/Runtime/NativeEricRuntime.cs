using EricWategay.Api.Runtime.Native;
using EricWategay.Api.Services;

namespace EricWategay.Api.Runtime;

public sealed class NativeEricRuntime : IEricRuntime, IEricRuntimeReadinessProbe
{
    private readonly EricGatewayOptions options;
    private readonly EricNativeLibraryLoader libraryLoader;
    private readonly ILogger<NativeEricRuntime> logger;

    public NativeEricRuntime(
        EricGatewayOptions options,
        EricNativeLibraryLoader libraryLoader,
        ILogger<NativeEricRuntime> logger
    )
    {
        this.options = options;
        this.libraryLoader = libraryLoader;
        this.logger = logger;
    }

    public Task<EricRuntimeReadiness> CheckReadinessAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (string.IsNullOrWhiteSpace(options.LibPath))
        {
            return Task.FromResult(
                new EricRuntimeReadiness(false, "ERIC_LIB_PATH is not configured", "native")
            );
        }

        if (
            libraryLoader.TryEnsureLoaded(options.LibPath, out var loadedFrom, out var errorMessage)
            && !string.IsNullOrWhiteSpace(loadedFrom)
        )
        {
            return Task.FromResult(
                new EricRuntimeReadiness(true, $"Native library loaded from {loadedFrom}", "native")
            );
        }

        return Task.FromResult(new EricRuntimeReadiness(false, errorMessage ?? "Failed to load ERiC native library", "native"));
    }

    public Task<EricRuntimeResult> ValidateAsync(EricRuntimeRequest request, CancellationToken cancellationToken)
    {
        return ExecuteAsync(request, "validate", cancellationToken);
    }

    public Task<EricRuntimeResult> SubmitAsync(EricRuntimeRequest request, CancellationToken cancellationToken)
    {
        return ExecuteAsync(request, "submit", cancellationToken);
    }

    private async Task<EricRuntimeResult> ExecuteAsync(
        EricRuntimeRequest request,
        string action,
        CancellationToken cancellationToken
    )
    {
        var startedAt = DateTimeOffset.UtcNow;
        var readiness = await CheckReadinessAsync(cancellationToken);
        if (!readiness.IsReady)
        {
            throw new EricRuntimeUnavailableException(readiness.Reason);
        }

        Directory.CreateDirectory(options.WorkDir);
        Directory.CreateDirectory(request.WorkDirectory);

        // NOTE: Per-request native context isolation is required for ERiC interop safety.
        using var _ = EricNativeContextHandle.CreateInvalid();

        logger.LogInformation(
            "eric_native_runtime_placeholder requestId={RequestId} reportId={ReportId} reportType={ReportType} action={Action}",
            request.RequestId,
            request.ReportId,
            request.ReportType,
            action
        );

        return new EricRuntimeResult
        {
            RequestId = request.RequestId,
            Outcome = "runtime_error",
            Messages =
            [
                new EricRuntimeMessage
                {
                    Severity = "error",
                    Code = "ERIC_NATIVE_NOT_IMPLEMENTED",
                    Text = "Native ERiC interop is scaffolded but not implemented yet",
                },
            ],
            StartedAt = startedAt,
            FinishedAt = DateTimeOffset.UtcNow,
            Retryable = false,
        };
    }
}
