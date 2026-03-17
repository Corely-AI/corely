using System.Text;
using EricWategay.Api.Contracts;

namespace EricWategay.Api.Services;

public sealed class EricRequestValidator
{
    private readonly EricGatewayOptions options;

    public EricRequestValidator(EricGatewayOptions options)
    {
        this.options = options;
    }

    public Dictionary<string, string[]> Validate(EricRequestDto request)
    {
        var errors = new Dictionary<string, List<string>>(StringComparer.Ordinal);

        if (string.IsNullOrWhiteSpace(request.RequestId))
        {
            AddError(errors, "requestId", "requestId is required");
        }

        if (string.IsNullOrWhiteSpace(request.ReportId))
        {
            AddError(errors, "reportId", "reportId is required");
        }

        if (string.IsNullOrWhiteSpace(request.ReportType))
        {
            AddError(errors, "reportType", "reportType is required");
        }

        if (!request.TaxYear.HasValue)
        {
            AddError(errors, "taxYear", "taxYear is required");
        }
        else if (request.TaxYear.Value is < 1900 or > 3000)
        {
            AddError(errors, "taxYear", "taxYear must be between 1900 and 3000");
        }

        if (!IsModeValid(request.Mode))
        {
            AddError(errors, "mode", "mode must be 'test' or 'prod'");
        }

        var hasPayload = request.Payload.HasValue && request.Payload.Value.ValueKind == System.Text.Json.JsonValueKind.Object;
        var hasXml = !string.IsNullOrWhiteSpace(request.Xml);

        if (!hasPayload && !hasXml)
        {
            AddError(errors, "payload", "either payload or xml must be provided");
        }

        if (hasXml)
        {
            var xmlBytes = Encoding.UTF8.GetByteCount(request.Xml!);
            if (xmlBytes > options.MaxPayloadBytes)
            {
                AddError(errors, "xml", $"xml payload exceeds MAX_PAYLOAD_BYTES ({options.MaxPayloadBytes})");
            }
        }

        return errors.ToDictionary(item => item.Key, item => item.Value.ToArray(), StringComparer.Ordinal);
    }

    private static bool IsModeValid(string? mode)
    {
        return string.Equals(mode, "test", StringComparison.OrdinalIgnoreCase)
            || string.Equals(mode, "prod", StringComparison.OrdinalIgnoreCase);
    }

    private static void AddError(Dictionary<string, List<string>> errors, string key, string message)
    {
        if (!errors.TryGetValue(key, out var values))
        {
            values = [];
            errors[key] = values;
        }

        values.Add(message);
    }
}
