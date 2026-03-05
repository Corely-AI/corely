using EricWategay.Api.Contracts;
using EricWategay.Api.Services;

namespace EricWategay.Api.Tests;

public sealed class RequestValidationTests
{
    private readonly EricRequestValidator validator = new(new EricGatewayOptions { MaxPayloadBytes = 4096 });

    [Fact]
    public void Validate_ShouldFail_WhenRequestIdMissing()
    {
        var request = BuildValidRequest();
        request.RequestId = null;

        var errors = validator.Validate(request);

        Assert.Contains("requestId", errors.Keys);
    }

    [Fact]
    public void Validate_ShouldFail_WhenTaxYearInvalid()
    {
        var request = BuildValidRequest();
        request.TaxYear = 1800;

        var errors = validator.Validate(request);

        Assert.Contains("taxYear", errors.Keys);
    }

    [Fact]
    public void Validate_ShouldFail_WhenModeInvalid()
    {
        var request = BuildValidRequest();
        request.Mode = "sandbox";

        var errors = validator.Validate(request);

        Assert.Contains("mode", errors.Keys);
    }

    private static EricRequestDto BuildValidRequest()
    {
        return new EricRequestDto
        {
            RequestId = "req-1",
            ReportId = "report-1",
            ReportType = "annual_income_report",
            TaxYear = 2025,
            Mode = "test",
            Payload = System.Text.Json.JsonDocument.Parse("{\"foo\":\"bar\"}").RootElement,
            Options = new EricRequestOptionsDto(),
        };
    }
}
