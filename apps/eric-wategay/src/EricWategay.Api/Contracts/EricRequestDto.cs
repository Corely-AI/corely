using System.Text.Json;
using System.Text.Json.Serialization;

namespace EricWategay.Api.Contracts;

public sealed class EricRequestDto
{
    [JsonPropertyName("requestId")]
    public string? RequestId { get; set; }

    [JsonPropertyName("filingId")]
    public string? FilingId { get; set; }

    [JsonPropertyName("reportId")]
    public string? ReportId { get; set; }

    [JsonPropertyName("reportType")]
    public string? ReportType { get; set; }

    [JsonPropertyName("taxYear")]
    public int? TaxYear { get; set; }

    [JsonPropertyName("mode")]
    public string? Mode { get; set; }

    [JsonPropertyName("payload")]
    public JsonElement? Payload { get; set; }

    [JsonPropertyName("xml")]
    public string? Xml { get; set; }

    [JsonPropertyName("credentials")]
    public EricRequestCredentialsDto? Credentials { get; set; }

    [JsonPropertyName("options")]
    public EricRequestOptionsDto? Options { get; set; }
}

public sealed class EricRequestCredentialsDto
{
    [JsonPropertyName("certificatePfxOrP12BytesBase64")]
    public string? CertificatePfxOrP12BytesBase64 { get; set; }

    [JsonPropertyName("certificateDocumentRef")]
    public string? CertificateDocumentRef { get; set; }

    [JsonPropertyName("certificatePassword")]
    public string? CertificatePassword { get; set; }
}

public sealed class EricRequestOptionsDto
{
    [JsonPropertyName("generateProtocolPdf")]
    public bool GenerateProtocolPdf { get; set; }

    [JsonPropertyName("returnXml")]
    public bool ReturnXml { get; set; }

    [JsonPropertyName("returnLog")]
    public bool ReturnLog { get; set; }
}
