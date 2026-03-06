using System.Net;
using System.Net.Http.Json;
using EricWategay.Api.Contracts;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace EricWategay.Api.Tests;

public sealed class SmokeEndpointsTests
{
    [Fact]
    public async Task Health_ShouldReturnOk()
    {
        await using var factory = CreateFactory(
            new Dictionary<string, string?>
            {
                ["ERIC_STUB_SUCCESS"] = "true",
            }
        );

        using var client = factory.CreateClient();
        var response = await client.GetAsync("/v1/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        Assert.NotNull(payload);
        Assert.Equal("ok", payload!["status"].ToString());
    }

    [Fact]
    public async Task Ready_ShouldReturnServiceUnavailable_WhenLibPathMissingAndStubDisabled()
    {
        await using var factory = CreateFactory(
            new Dictionary<string, string?>
            {
                ["ERIC_STUB_SUCCESS"] = "false",
                ["ERIC_LIB_PATH"] = string.Empty,
            }
        );

        using var client = factory.CreateClient();
        var response = await client.GetAsync("/v1/ready");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    [Fact]
    public async Task Validate_ShouldReturnEricResult_WhenStubEnabled()
    {
        await using var factory = CreateFactory(
            new Dictionary<string, string?>
            {
                ["ERIC_STUB_SUCCESS"] = "true",
            }
        );

        using var client = factory.CreateClient();
        var request = new EricRequestDto
        {
            RequestId = "req-smoke-1",
            ReportId = "report-smoke-1",
            ReportType = "annual_income_report",
            TaxYear = 2025,
            Mode = "test",
            Payload = System.Text.Json.JsonDocument.Parse("{\"foo\":\"bar\"}").RootElement,
            Options = new EricRequestOptionsDto { ReturnXml = true },
        };

        var response = await client.PostAsJsonAsync("/v1/eric/validate", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<EricResultDto>();
        Assert.NotNull(result);
        Assert.Equal("req-smoke-1", result!.RequestId);
    }

    private static WebApplicationFactory<Program> CreateFactory(Dictionary<string, string?> values)
    {
        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Production");
            builder.ConfigureAppConfiguration((_, cfg) =>
            {
                cfg.AddInMemoryCollection(values);
            });
        });
    }
}
