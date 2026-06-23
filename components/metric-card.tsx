export function MetricCard({
  label,
  value,
  detail,
  icon
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <section className="card metric">
      <div>
        <p className="eyebrow">{label}</p>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
      <div className="icon">{icon}</div>
    </section>
  );
}

