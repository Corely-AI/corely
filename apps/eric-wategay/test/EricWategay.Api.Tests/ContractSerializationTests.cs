using System.Text.Json;
using EricWategay.Api.Contracts;

namespace EricWategay.Api.Tests;

public sealed class ContractSerializationTests
{
    [Fact]
    public void EricRequestDto_ShouldUseCamelCaseJsonNames()
    {
        var request = new EricRequestDto
        {
            RequestId = "req-1",
            ReportId = "report-1",
            ReportType = "annual_income_report",
            TaxYear = 2025,
            Mode = "test",
            Payload = JsonDocument.Parse("{\"foo\":\"bar\"}").RootElement,
            Options = new EricRequestOptionsDto { ReturnXml = true },
        };

        var json = JsonSerializer.Serialize(request);

        Assert.Contains("\"requestId\"", json, StringComparison.Ordinal);
        Assert.Contains("\"reportType\"", json, StringComparison.Ordinal);
        Assert.DoesNotContain("\"RequestId\"", json, StringComparison.Ordinal);

        var roundtrip = JsonSerializer.Deserialize<EricRequestDto>(json);
        Assert.Equal("req-1", roundtrip?.RequestId);
        Assert.Equal("annual_income_report", roundtrip?.ReportType);
    }

    [Fact]
    public void EricResultDto_ShouldUseCamelCaseJsonNames()
    {
        var result = new EricResultDto
        {
            RequestId = "req-1",
            Outcome = "success",
            Messages =
            [
                new EricResultMessageDto
                {
                    Severity = "info",
                    Code = "ERIC_OK",
                    Text = "ok",
                },
            ],
            Timings = new EricResultTimingsDto
            {
                StartedAt = DateTimeOffset.UtcNow,
                FinishedAt = DateTimeOffset.UtcNow,
                DurationMs = 1,
            },
            Retryable = false,
        };

        var json = JsonSerializer.Serialize(result);

        Assert.Contains("\"requestId\"", json, StringComparison.Ordinal);
        Assert.Contains("\"durationMs\"", json, StringComparison.Ordinal);
        Assert.DoesNotContain("\"RequestId\"", json, StringComparison.Ordinal);

        var roundtrip = JsonSerializer.Deserialize<EricResultDto>(json);
        Assert.Equal("req-1", roundtrip?.RequestId);
        Assert.Equal("success", roundtrip?.Outcome);
    }
}
