namespace EricWategay.Api.Services;

public sealed class EricGatewayOptions
{
    public string LibPath { get; init; } = string.Empty;

    public string WorkDir { get; init; } = "/tmp/eric";

    public string ModeDefault { get; init; } = "test";

    public string? HerstellerId { get; init; }

    public bool StubSuccess { get; init; }

    public long MaxPayloadBytes { get; init; } = 1_048_576;

    public int RuntimeTimeoutMs { get; init; } = 30_000;

    public int MaxConcurrentCalls { get; init; } = 4;

    public TimeSpan RuntimeTimeout => TimeSpan.FromMilliseconds(RuntimeTimeoutMs);

    public static EricGatewayOptions FromConfiguration(IConfiguration configuration)
    {
        return new EricGatewayOptions
        {
            LibPath = configuration["ERIC_LIB_PATH"] ?? string.Empty,
            WorkDir = configuration["ERIC_WORKDIR"] ?? "/tmp/eric",
            ModeDefault = ParseMode(configuration["ERIC_MODE_DEFAULT"]),
            HerstellerId = configuration["ERIC_HERSTELLER_ID"],
            StubSuccess = ParseBool(configuration["ERIC_STUB_SUCCESS"]),
            MaxPayloadBytes = ParseLong(configuration["MAX_PAYLOAD_BYTES"], 1_048_576),
            RuntimeTimeoutMs = ParseInt(configuration["ERIC_RUNTIME_TIMEOUT_MS"], 30_000),
            MaxConcurrentCalls = Math.Max(1, ParseInt(configuration["ERIC_MAX_CONCURRENT_CALLS"], 4)),
        };
    }

    private static bool ParseBool(string? raw)
    {
        return string.Equals(raw, "true", StringComparison.OrdinalIgnoreCase) || raw == "1";
    }

    private static int ParseInt(string? raw, int fallback)
    {
        return int.TryParse(raw, out var value) ? value : fallback;
    }

    private static long ParseLong(string? raw, long fallback)
    {
        return long.TryParse(raw, out var value) ? value : fallback;
    }

    private static string ParseMode(string? raw)
    {
        if (string.Equals(raw, "prod", StringComparison.OrdinalIgnoreCase))
        {
            return "prod";
        }

        return "test";
    }
}
