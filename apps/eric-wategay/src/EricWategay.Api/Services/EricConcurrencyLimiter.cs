namespace EricWategay.Api.Services;

public sealed class EricConcurrencyLimiter
{
    private readonly SemaphoreSlim semaphore;

    public EricConcurrencyLimiter(int maxConcurrency)
    {
        semaphore = new SemaphoreSlim(Math.Max(1, maxConcurrency), Math.Max(1, maxConcurrency));
    }

    public IDisposable? TryAcquire()
    {
        if (!semaphore.Wait(0))
        {
            return null;
        }

        return new Releaser(semaphore);
    }

    private sealed class Releaser : IDisposable
    {
        private readonly SemaphoreSlim semaphore;
        private bool disposed;

        public Releaser(SemaphoreSlim semaphore)
        {
            this.semaphore = semaphore;
        }

        public void Dispose()
        {
            if (disposed)
            {
                return;
            }

            disposed = true;
            semaphore.Release();
        }
    }
}
