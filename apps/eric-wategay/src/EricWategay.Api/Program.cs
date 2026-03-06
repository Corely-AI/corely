using System.Reflection;
using System.Text;
using EricWategay.Api.Contracts;
using EricWategay.Api.Runtime;
using EricWategay.Api.Runtime.Native;
using EricWategay.Api.Services;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.OpenApi;

if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("ASPNETCORE_URLS")))
{
    Environment.SetEnvironmentVariable("ASPNETCORE_URLS", "http://0.0.0.0:8088");
}

var builder = WebApplication.CreateBuilder(args);
var options = EricGatewayOptions.FromConfiguration(builder.Configuration);

builder.WebHost.ConfigureKestrel(kestrel =>
{
    kestrel.Limits.MaxRequestBodySize = options.MaxPayloadBytes;
});

builder.Logging.ClearProviders();
builder.Logging.AddJsonConsole();

builder.Services.AddSingleton(options);
builder.Services.AddSingleton<UptimeClock>();
builder.Services.AddSingleton<EricRequestValidator>();
builder.Services.AddSingleton<EricLogRedactor>();
builder.Services.AddSingleton(new EricConcurrencyLimiter(options.MaxConcurrentCalls));
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(swagger =>
{
    swagger.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "ERiC Gateway API",
        Version = "v1",
        Description = "ERiC validate/submit gateway for Corely tax worker",
    });
});

if (options.StubSuccess || string.IsNullOrWhiteSpace(options.LibPath))
{
    builder.Services.AddSingleton<StubEricRuntime>();
    builder.Services.AddSingleton<IEricRuntime>(sp => sp.GetRequiredService<StubEricRuntime>());
    builder.Services.AddSingleton<IEricRuntimeReadinessProbe>(
        sp => sp.GetRequiredService<StubEricRuntime>()
    );
}
else
{
    builder.Services.AddSingleton<EricNativeLibraryLoader>();
    builder.Services.AddSingleton<NativeEricRuntime>();
    builder.Services.AddSingleton<IEricRuntime>(sp => sp.GetRequiredService<NativeEricRuntime>());
    builder.Services.AddSingleton<IEricRuntimeReadinessProbe>(
        sp => sp.GetRequiredService<NativeEricRuntime>()
    );
}

var app = builder.Build();

app.UseExceptionHandler(handler =>
{
    handler.Run(async context =>
    {
        var requestId = GetOrCreateRequestId(context);
        context.Response.Headers["X-Request-Id"] = requestId;

        var feature = context.Features.Get<IExceptionHandlerFeature>();
        var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("Global");
        logger.LogError(
            feature?.Error,
            "eric_gateway_unhandled_exception requestId={RequestId}",
            requestId
        );

        var details = new ProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Title = "Gateway runtime error",
            Detail = "Unexpected runtime error while processing ERiC request",
            Extensions = { ["requestId"] = requestId },
        };

        await Results.Problem(
                title: details.Title,
                detail: details.Detail,
                statusCode: details.Status,
                extensions: details.Extensions
            )
            .ExecuteAsync(context);
    });
});

app.Use(async (context, next) =>
{
    var requestId = GetOrCreateRequestId(context);
    context.Response.Headers["X-Request-Id"] = requestId;

    using var _ = app.Logger.BeginScope(
        new Dictionary<string, object?>
        {
            ["requestId"] = requestId,
            ["path"] = context.Request.Path.Value,
            ["method"] = context.Request.Method,
        }
    );

    await next();
});

app.Use(async (context, next) =>
{
    if (context.Request.ContentLength is > 0 && context.Request.ContentLength > options.MaxPayloadBytes)
    {
        var requestId = GetOrCreateRequestId(context);
        await Results.Problem(
                title: "Payload too large",
                detail: $"Request body exceeds MAX_PAYLOAD_BYTES ({options.MaxPayloadBytes})",
                statusCode: StatusCodes.Status413PayloadTooLarge,
                extensions: new Dictionary<string, object?> { ["requestId"] = requestId }
            )
            .ExecuteAsync(context);
        return;
    }

    await next();
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(swagger =>
    {
        swagger.SwaggerEndpoint("/swagger/v1/swagger.json", "ERiC Gateway v1");
    });
}

var version = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "0.0.0";
var api = app.MapGroup("/v1").WithTags("v1");

api.MapGet("/health", (UptimeClock uptimeClock) =>
    Results.Ok(
        new
        {
            status = "ok",
            version,
            uptime = uptimeClock.Uptime.ToString("c"),
        }
    )
)
    .WithName("GetHealth")
    .Produces(StatusCodes.Status200OK);

api.MapGet(
    "/ready",
    async (HttpContext context, IEricRuntimeReadinessProbe readinessProbe, CancellationToken cancellationToken) =>
    {
        var readiness = await readinessProbe.CheckReadinessAsync(cancellationToken);
        if (readiness.IsReady)
        {
            return Results.Ok(
                new
                {
                    status = "ready",
                    runtime = readiness.Runtime,
                    reason = readiness.Reason,
                }
            );
        }

        return Results.Problem(
            title: "Gateway is not ready",
            detail: readiness.Reason,
            statusCode: StatusCodes.Status503ServiceUnavailable,
            extensions: new Dictionary<string, object?>
            {
                ["requestId"] = GetOrCreateRequestId(context),
                ["runtime"] = readiness.Runtime,
            }
        );
    }
)
    .WithName("GetReadiness")
    .Produces(StatusCodes.Status200OK)
    .Produces(StatusCodes.Status503ServiceUnavailable);

api.MapPost(
    "/eric/validate",
    async (
        HttpContext context,
        EricRequestDto request,
        IEricRuntime runtime,
        EricRequestValidator validator,
        EricLogRedactor redactor,
        EricConcurrencyLimiter limiter,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken
    ) =>
        await HandleEricRequestAsync(
            context,
            request,
            EricGatewayAction.Validate,
            runtime,
            validator,
            redactor,
            limiter,
            options,
            loggerFactory.CreateLogger("EricValidate"),
            cancellationToken
        )
)
    .WithName("ValidateEric")
    .WithSummary("Validate ERiC payload")
    .WithDescription(
        "Validate request example: {\"requestId\":\"req-123\",\"reportId\":\"report-123\",\"reportType\":\"annual_income_report\",\"taxYear\":2025,\"mode\":\"test\",\"payload\":{\"annualIncome\":{\"incomeSources\":[],\"noIncomeFlag\":true}},\"options\":{\"generateProtocolPdf\":true,\"returnXml\":true,\"returnLog\":true}}"
    )
    .Accepts<EricRequestDto>("application/json")
    .Produces<EricResultDto>(StatusCodes.Status200OK)
    .ProducesValidationProblem(StatusCodes.Status400BadRequest)
    .Produces(StatusCodes.Status413PayloadTooLarge)
    .Produces(StatusCodes.Status429TooManyRequests)
    .Produces(StatusCodes.Status500InternalServerError)
    .Produces(StatusCodes.Status503ServiceUnavailable)
    .Produces(StatusCodes.Status504GatewayTimeout);

api.MapPost(
    "/eric/submit",
    async (
        HttpContext context,
        EricRequestDto request,
        IEricRuntime runtime,
        EricRequestValidator validator,
        EricLogRedactor redactor,
        EricConcurrencyLimiter limiter,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken
    ) =>
        await HandleEricRequestAsync(
            context,
            request,
            EricGatewayAction.Submit,
            runtime,
            validator,
            redactor,
            limiter,
            options,
            loggerFactory.CreateLogger("EricSubmit"),
            cancellationToken
        )
)
    .WithName("SubmitEric")
    .WithSummary("Submit ERiC payload")
    .WithDescription(
        "Submit request example: {\"requestId\":\"req-123\",\"reportId\":\"report-123\",\"reportType\":\"annual_income_report\",\"taxYear\":2025,\"mode\":\"prod\",\"xml\":\"<elster/>\",\"options\":{\"generateProtocolPdf\":true,\"returnXml\":false,\"returnLog\":true}}"
    )
    .Accepts<EricRequestDto>("application/json")
    .Produces<EricResultDto>(StatusCodes.Status200OK)
    .ProducesValidationProblem(StatusCodes.Status400BadRequest)
    .Produces(StatusCodes.Status413PayloadTooLarge)
    .Produces(StatusCodes.Status429TooManyRequests)
    .Produces(StatusCodes.Status500InternalServerError)
    .Produces(StatusCodes.Status503ServiceUnavailable)
    .Produces(StatusCodes.Status504GatewayTimeout);

app.Run();

static async Task<IResult> HandleEricRequestAsync(
    HttpContext context,
    EricRequestDto request,
    EricGatewayAction action,
    IEricRuntime runtime,
    EricRequestValidator validator,
    EricLogRedactor redactor,
    EricConcurrencyLimiter limiter,
    EricGatewayOptions options,
    ILogger logger,
    CancellationToken cancellationToken
)
{
    var requestId = GetOrCreateRequestId(context);
    if (string.IsNullOrWhiteSpace(request.RequestId))
    {
        request.RequestId = requestId;
    }

    request.Options ??= new EricRequestOptionsDto();

    var validationErrors = validator.Validate(request);
    if (validationErrors.Count > 0)
    {
        return Results.ValidationProblem(
            validationErrors,
            title: "Invalid ERiC request",
            statusCode: StatusCodes.Status400BadRequest,
            extensions: new Dictionary<string, object?> { ["requestId"] = requestId }
        );
    }

    if (!string.IsNullOrWhiteSpace(request.Xml))
    {
        var xmlBytes = Encoding.UTF8.GetByteCount(request.Xml);
        if (xmlBytes > options.MaxPayloadBytes)
        {
            return Results.Problem(
                title: "Payload too large",
                detail: $"XML payload exceeds MAX_PAYLOAD_BYTES ({options.MaxPayloadBytes})",
                statusCode: StatusCodes.Status413PayloadTooLarge,
                extensions: new Dictionary<string, object?> { ["requestId"] = requestId }
            );
        }
    }

    using var lease = limiter.TryAcquire();
    if (lease is null)
    {
        return Results.Problem(
            title: "Gateway overloaded",
            detail: "Too many concurrent ERiC requests. Retry later.",
            statusCode: StatusCodes.Status429TooManyRequests,
            extensions: new Dictionary<string, object?> { ["requestId"] = requestId }
        );
    }

    logger.LogInformation(
        "eric_request_received action={Action} requestId={RequestId} reportId={ReportId} reportType={ReportType} payload={@Payload}",
        action.ToString().ToLowerInvariant(),
        request.RequestId,
        request.ReportId,
        request.ReportType,
        redactor.RedactRequest(request)
    );

    using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
    timeoutCts.CancelAfter(options.RuntimeTimeout);

    try
    {
        var runtimeRequest = new EricRuntimeRequest
        {
            RequestId = request.RequestId!,
            ReportId = request.ReportId!,
            ReportType = request.ReportType!,
            TaxYear = request.TaxYear ?? 0,
            Mode = request.Mode ?? options.ModeDefault,
            Action = action,
            WorkDirectory = Path.Combine(options.WorkDir, request.RequestId!),
            Request = request,
        };

        var runtimeResult = action == EricGatewayAction.Validate
            ? await runtime.ValidateAsync(runtimeRequest, timeoutCts.Token)
            : await runtime.SubmitAsync(runtimeRequest, timeoutCts.Token);

        return Results.Ok(runtimeResult.ToDto());
    }
    catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
    {
        return Results.Problem(
            title: "Gateway timeout",
            detail: "ERiC runtime call exceeded configured timeout",
            statusCode: StatusCodes.Status504GatewayTimeout,
            extensions: new Dictionary<string, object?> { ["requestId"] = requestId }
        );
    }
    catch (EricRuntimeUnavailableException ex)
    {
        return Results.Problem(
            title: "Gateway is not ready",
            detail: ex.Message,
            statusCode: StatusCodes.Status503ServiceUnavailable,
            extensions: new Dictionary<string, object?> { ["requestId"] = requestId }
        );
    }
}

static string GetOrCreateRequestId(HttpContext context)
{
    if (context.Items.TryGetValue("requestId", out var existing) && existing is string requestId)
    {
        return requestId;
    }

    var headerValue = context.Request.Headers["X-Request-Id"].ToString();
    var resolved = string.IsNullOrWhiteSpace(headerValue) ? Guid.NewGuid().ToString("n") : headerValue;
    context.Items["requestId"] = resolved;
    return resolved;
}

public partial class Program;
