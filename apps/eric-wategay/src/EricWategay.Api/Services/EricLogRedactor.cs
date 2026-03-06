using System.Security.Cryptography;
using System.Text;
using EricWategay.Api.Contracts;

namespace EricWategay.Api.Services;

public sealed class EricLogRedactor
{
    public IDictionary<string, object?> RedactRequest(EricRequestDto request)
    {
        var certificateBase64 = request.Credentials?.CertificatePfxOrP12BytesBase64;

        return new Dictionary<string, object?>
        {
            ["requestId"] = request.RequestId,
            ["reportId"] = request.ReportId,
            ["reportType"] = request.ReportType,
            ["taxYear"] = request.TaxYear,
            ["mode"] = request.Mode,
            ["hasPayload"] = request.Payload.HasValue,
            ["hasXml"] = !string.IsNullOrWhiteSpace(request.Xml),
            ["xmlSha256"] = HashValue(request.Xml),
            ["xmlBytes"] = request.Xml is null ? 0 : Encoding.UTF8.GetByteCount(request.Xml),
            ["hasCertificateInline"] = !string.IsNullOrWhiteSpace(certificateBase64),
            ["certificateSha256"] = HashValue(certificateBase64),
            ["certificateDocumentRef"] = request.Credentials?.CertificateDocumentRef,
            ["certificatePasswordProvided"] = !string.IsNullOrWhiteSpace(request.Credentials?.CertificatePassword),
            ["generateProtocolPdf"] = request.Options?.GenerateProtocolPdf,
            ["returnXml"] = request.Options?.ReturnXml,
            ["returnLog"] = request.Options?.ReturnLog,
        };
    }

    private static string? HashValue(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return null;
        }

        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(bytes);
    }
}
