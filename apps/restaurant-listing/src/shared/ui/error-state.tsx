export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="state-card">
    <h3>Something went wrong</h3>
    <p>{message}</p>
    {onRetry ? (
      <button type="button" className="btn btn-secondary" onClick={onRetry}>
        Retry
      </button>
    ) : null}
  </div>
);
