using System.Text.Json.Serialization;

namespace EricWategay.Api.Contracts;

public sealed class EricResultDto
{
    [JsonPropertyName("requestId")]
    public required string RequestId { get; init; }

    [JsonPropertyName("outcome")]
    public required string Outcome { get; init; }

    [JsonPropertyName("ericVersion")]
    public string? EricVersion { get; init; }

    [JsonPropertyName("schemaVersion")]
    public string? SchemaVersion { get; init; }

    [JsonPropertyName("datenartVersion")]
    public string? DatenartVersion { get; init; }

    [JsonPropertyName("messages")]
    public IReadOnlyList<EricResultMessageDto> Messages { get; init; } = [];

    [JsonPropertyName("artifacts")]
    public EricResultArtifactsDto? Artifacts { get; init; }

    [JsonPropertyName("timings")]
    public required EricResultTimingsDto Timings { get; init; }

    [JsonPropertyName("retryable")]
    public required bool Retryable { get; init; }
}

public sealed class EricResultMessageDto
{
    [JsonPropertyName("severity")]
    public required string Severity { get; init; }

    [JsonPropertyName("code")]
    public required string Code { get; init; }

    [JsonPropertyName("text")]
    public required string Text { get; init; }

    [JsonPropertyName("path")]
    public string? Path { get; init; }

    [JsonPropertyName("ruleId")]
    public string? RuleId { get; init; }
}

public sealed class EricResultArtifactsDto
{
    [JsonPropertyName("xmlBase64")]
    public string? XmlBase64 { get; init; }

    [JsonPropertyName("protocolPdfBase64")]
    public string? ProtocolPdfBase64 { get; init; }

    [JsonPropertyName("logTextBase64")]
    public string? LogTextBase64 { get; init; }

    [JsonPropertyName("logText")]
    public string? LogText { get; init; }
}

public sealed class EricResultTimingsDto
{
    [JsonPropertyName("startedAt")]
    public required DateTimeOffset StartedAt { get; init; }

    [JsonPropertyName("finishedAt")]
    public required DateTimeOffset FinishedAt { get; init; }

    [JsonPropertyName("durationMs")]
    public required long DurationMs { get; init; }
}
