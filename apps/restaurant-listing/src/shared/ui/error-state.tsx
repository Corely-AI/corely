import { useBrowserLocale } from "@corely/web-shared/shared/i18n/browser-locale";
import messages from "@/shared/i18n/locales/directory.json";
export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => {
  const copy = messages[useBrowserLocale()];
  return (
    <div className="state-card">
      <h3>{copy.error}</h3>
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          {copy.retry}
        </button>
      ) : null}
    </div>
  );
};
