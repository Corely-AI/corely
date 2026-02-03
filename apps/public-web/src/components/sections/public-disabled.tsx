export function PublicDisabledState({ message }: { message?: string }) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center px-6 py-16">
      <div className="w-full rounded-2xl border border-border bg-card px-6 py-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-foreground">Public site not published</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {message ?? "This workspace has not published its public site yet."}
        </p>
      </div>
    </div>
  );
}
