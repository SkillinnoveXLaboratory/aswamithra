export default function StatCard({ label, value, note, icon: Icon, tone = 'green' }) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <div className="stat-icon">{Icon ? <Icon size={22} /> : null}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {note ? <span>{note}</span> : null}
      </div>
    </article>
  );
}
