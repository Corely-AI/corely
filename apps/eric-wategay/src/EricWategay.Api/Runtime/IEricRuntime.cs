namespace EricWategay.Api.Runtime;

public interface IEricRuntime
{
    Task<EricRuntimeResult> ValidateAsync(EricRuntimeRequest request, CancellationToken cancellationToken);

    Task<EricRuntimeResult> SubmitAsync(EricRuntimeRequest request, CancellationToken cancellationToken);
}

public interface IEricRuntimeReadinessProbe
{
    Task<EricRuntimeReadiness> CheckReadinessAsync(CancellationToken cancellationToken);
}
