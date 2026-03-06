using EricWategay.Api.Contracts;

namespace EricWategay.Api.Runtime;

public enum EricGatewayAction
{
    Validate,
    Submit,
}

public sealed class EricRuntimeRequest
{
    public required string RequestId { get; init; }

    public required string ReportId { get; init; }

    public required string ReportType { get; init; }

    public required int TaxYear { get; init; }

    public required string Mode { get; init; }

    public required EricGatewayAction Action { get; init; }

    public required string WorkDirectory { get; init; }

    public required EricRequestDto Request { get; init; }
}

public sealed class EricRuntimeResult
{
    public required string RequestId { get; init; }

    public required string Outcome { get; init; }

    public string? EricVersion { get; init; }

    public string? SchemaVersion { get; init; }

    public string? DatenartVersion { get; init; }

    public IReadOnlyList<EricRuntimeMessage> Messages { get; init; } = [];

    public EricRuntimeArtifacts? Artifacts { get; init; }

    public required DateTimeOffset StartedAt { get; init; }

    public required DateTimeOffset FinishedAt { get; init; }

    public required bool Retryable { get; init; }

    public EricResultDto ToDto()
    {
        return new EricResultDto
        {
            RequestId = RequestId,
            Outcome = Outcome,
            EricVersion = EricVersion,
            SchemaVersion = SchemaVersion,
            DatenartVersion = DatenartVersion,
            Messages = Messages
                .Select(message => new EricResultMessageDto
                {
                    Severity = message.Severity,
                    Code = message.Code,
                    Text = message.Text,
                    Path = message.Path,
                    RuleId = message.RuleId,
                })
                .ToArray(),
            Artifacts = Artifacts is null
                ? null
                : new EricResultArtifactsDto
                {
                    XmlBase64 = Artifacts.XmlBase64,
                    ProtocolPdfBase64 = Artifacts.ProtocolPdfBase64,
                    LogTextBase64 = Artifacts.LogTextBase64,
                    LogText = Artifacts.LogText,
                },
            Timings = new EricResultTimingsDto
            {
                StartedAt = StartedAt,
                FinishedAt = FinishedAt,
                DurationMs = Math.Max(0, (long)(FinishedAt - StartedAt).TotalMilliseconds),
            },
            Retryable = Retryable,
        };
    }
}

public sealed class EricRuntimeMessage
{
    public required string Severity { get; init; }

    public required string Code { get; init; }

    public required string Text { get; init; }

    public string? Path { get; init; }

    public string? RuleId { get; init; }
}

public sealed class EricRuntimeArtifacts
{
    public string? XmlBase64 { get; init; }

    public string? ProtocolPdfBase64 { get; init; }

    public string? LogTextBase64 { get; init; }

    public string? LogText { get; init; }
}

public sealed record EricRuntimeReadiness(bool IsReady, string Reason, string Runtime);

public sealed class EricRuntimeUnavailableException : Exception
{
    public EricRuntimeUnavailableException(string message)
        : base(message)
    {
    }
}
