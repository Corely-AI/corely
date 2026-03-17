using System.Text.Json;
using EricWategay.Api.Contracts;
using EricWategay.Api.Services;

namespace EricWategay.Api.Tests;

public sealed class LogRedactionTests
{
    [Fact]
    public void Redactor_ShouldNotLeakSecrets()
    {
        var request = new EricRequestDto
        {
            RequestId = "req-1",
            ReportId = "report-1",
            ReportType = "annual_income_report",
            TaxYear = 2025,
            Mode = "test",
            Xml = "<xml>secret-content</xml>",
            Credentials = new EricRequestCredentialsDto
            {
                CertificatePfxOrP12BytesBase64 = "base64-certificate-data",
                CertificatePassword = "super-secret-password",
            },
            Options = new EricRequestOptionsDto { ReturnXml = true, ReturnLog = true },
        };

        var redactor = new EricLogRedactor();
        var redacted = redactor.RedactRequest(request);
        var json = JsonSerializer.Serialize(redacted);

        Assert.DoesNotContain("super-secret-password", json, StringComparison.Ordinal);
        Assert.DoesNotContain("base64-certificate-data", json, StringComparison.Ordinal);
        Assert.Contains("certificatePasswordProvided", json, StringComparison.Ordinal);
    }
}
