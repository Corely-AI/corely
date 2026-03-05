using System.Text;
using EricWategay.Api.Runtime;
using EricWategay.Api.Services;

namespace EricWategay.Api.Runtime;

public sealed class StubEricRuntime : IEricRuntime, IEricRuntimeReadinessProbe
{
    private readonly EricGatewayOptions options;
    private readonly ILogger<StubEricRuntime> logger;

    public StubEricRuntime(EricGatewayOptions options, ILogger<StubEricRuntime> logger)
    {
        this.options = options;
        this.logger = logger;
    }

    public Task<EricRuntimeReadiness> CheckReadinessAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (options.StubSuccess)
        {
            return Task.FromResult(new EricRuntimeReadiness(true, "stub success mode enabled", "stub"));
        }

        return Task.FromResult(new EricRuntimeReadiness(false, "ERiC runtime not configured", "stub"));
    }

    public Task<EricRuntimeResult> ValidateAsync(EricRuntimeRequest request, CancellationToken cancellationToken)
    {
        return Task.FromResult(BuildResult(request, "validate", cancellationToken));
    }

    public Task<EricRuntimeResult> SubmitAsync(EricRuntimeRequest request, CancellationToken cancellationToken)
    {
        return Task.FromResult(BuildResult(request, "submit", cancellationToken));
    }

    private EricRuntimeResult BuildResult(EricRuntimeRequest request, string action, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var startedAt = DateTimeOffset.UtcNow;

        if (!options.StubSuccess)
        {
            logger.LogWarning(
                "eric_stub_runtime_not_configured requestId={RequestId} reportId={ReportId} reportType={ReportType}",
                request.RequestId,
                request.ReportId,
                request.ReportType
            );

            return new EricRuntimeResult
            {
                RequestId = request.RequestId,
                Outcome = "runtime_error",
                EricVersion = "stub",
                Messages =
                [
                    new EricRuntimeMessage
                    {
                        Severity = "error",
                        Code = "ERIC_RUNTIME_NOT_CONFIGURED",
                        Text = "ERiC runtime not configured",
                    },
                ],
                StartedAt = startedAt,
                FinishedAt = DateTimeOffset.UtcNow,
                Retryable = false,
            };
        }

        var messages = new List<EricRuntimeMessage>
        {
            new()
            {
                Severity = "info",
                Code = action == "validate" ? "ERIC_STUB_VALIDATE_OK" : "ERIC_STUB_SUBMIT_OK",
                Text = action == "validate"
                    ? "Validation succeeded in stub runtime"
                    : "Submission succeeded in stub runtime",
            },
        };

        EricRuntimeArtifacts? artifacts = null;
        var requestOptions = request.Request.Options;
        if (requestOptions is not null)
        {
            artifacts = new EricRuntimeArtifacts
            {
                XmlBase64 = requestOptions.ReturnXml
                    ? Convert.ToBase64String(
                        Encoding.UTF8.GetBytes(
                            $"<stubEric action=\"{action}\" requestId=\"{request.RequestId}\" reportType=\"{request.ReportType}\" />"
                        )
                    )
                    : null,
                ProtocolPdfBase64 = requestOptions.GenerateProtocolPdf
                    ? Convert.ToBase64String(Encoding.UTF8.GetBytes("%PDF-1.4\n% Stub ERiC protocol\n"))
                    : null,
                LogTextBase64 = requestOptions.ReturnLog
                    ? Convert.ToBase64String(
                        Encoding.UTF8.GetBytes(
                            $"[{DateTimeOffset.UtcNow:O}] stub runtime action={action} requestId={request.RequestId}"
                        )
                    )
                    : null,
            };
        }

        return new EricRuntimeResult
        {
            RequestId = request.RequestId,
            Outcome = "success",
            EricVersion = "stub-v1",
            SchemaVersion = "stub-schema-v1",
            DatenartVersion = "stub-datenart-v1",
            Messages = messages,
            Artifacts = artifacts,
            StartedAt = startedAt,
            FinishedAt = DateTimeOffset.UtcNow,
            Retryable = false,
        };
    }
}
