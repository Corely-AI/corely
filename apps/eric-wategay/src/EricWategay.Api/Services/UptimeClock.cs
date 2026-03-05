namespace EricWategay.Api.Services;

public sealed class UptimeClock
{
    private readonly DateTimeOffset startedAt = DateTimeOffset.UtcNow;

    public DateTimeOffset StartedAt => startedAt;

    public TimeSpan Uptime => DateTimeOffset.UtcNow - startedAt;
}
