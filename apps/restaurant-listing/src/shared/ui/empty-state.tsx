export const EmptyState = ({ title, message }: { title: string; message: string }) => (
  <div className="state-card">
    <h3>{title}</h3>
    <p>{message}</p>
  </div>
);
