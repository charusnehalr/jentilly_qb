export function StatusBadge({ value }: { value: string }) {
  const dangerValues = ["urgent", "overdue", "expired"];
  const warnValues = ["partial", "ending_soon", "in_progress", "open"];
  const className = dangerValues.includes(value)
    ? "status danger"
    : warnValues.includes(value)
      ? "status warn"
      : "status";

  return <span className={className}>{value.replace("_", " ")}</span>;
}

