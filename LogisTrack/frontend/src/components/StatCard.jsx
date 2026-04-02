function StatCard({ label, value, accent = "blue" }) {
  return (
    <article className={`stat-card stat-${accent}`}>
      <p>{label}</p>
      <h3>{value}</h3>
    </article>
  );
}

export default StatCard;
