using EricWategay.Api.Contracts;
using EricWategay.Api.Runtime;
using EricWategay.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace EricWategay.Api.Tests;

public sealed class StubEricRuntimeTests
{
    [Fact]
    public async Task ValidateAsync_ShouldReturnRuntimeError_WhenStubSuccessDisabled()
    {
        var runtime = new StubEricRuntime(
            new EricGatewayOptions { StubSuccess = false },
            NullLogger<StubEricRuntime>.Instance
        );

        var result = await runtime.ValidateAsync(BuildRuntimeRequest(), CancellationToken.None);

        Assert.Equal("runtime_error", result.Outcome);
        Assert.Contains(result.Messages, message => message.Code == "ERIC_RUNTIME_NOT_CONFIGURED");
    }

    [Fact]
    public async Task SubmitAsync_ShouldReturnSuccessArtifacts_WhenStubSuccessEnabled()
    {
        var runtime = new StubEricRuntime(
            new EricGatewayOptions { StubSuccess = true },
            NullLogger<StubEricRuntime>.Instance
        );

        var request = BuildRuntimeRequest();
        request.Request.Options = new EricRequestOptionsDto
        {
            GenerateProtocolPdf = true,
            ReturnXml = true,
            ReturnLog = true,
        };

        var result = await runtime.SubmitAsync(request, CancellationToken.None);

        Assert.Equal("success", result.Outcome);
        Assert.NotNull(result.Artifacts);
        Assert.False(string.IsNullOrWhiteSpace(result.Artifacts?.XmlBase64));
        Assert.False(string.IsNullOrWhiteSpace(result.Artifacts?.ProtocolPdfBase64));
        Assert.False(string.IsNullOrWhiteSpace(result.Artifacts?.LogTextBase64));
    }

    private static EricRuntimeRequest BuildRuntimeRequest()
    {
        return new EricRuntimeRequest
        {
            RequestId = "req-1",
            ReportId = "report-1",
            ReportType = "annual_income_report",
            TaxYear = 2025,
            Mode = "test",
            Action = EricGatewayAction.Validate,
            WorkDirectory = "/tmp/eric/req-1",
            Request = new EricRequestDto
            {
                RequestId = "req-1",
                ReportId = "report-1",
                ReportType = "annual_income_report",
                TaxYear = 2025,
                Mode = "test",
                Payload = System.Text.Json.JsonDocument.Parse("{\"foo\":\"bar\"}").RootElement,
                Options = new EricRequestOptionsDto(),
            },
        };
    }
}
