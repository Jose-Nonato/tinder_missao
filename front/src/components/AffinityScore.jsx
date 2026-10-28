export default function AffinityScore({ value }) {
  return (
    <div className="affinity-score" aria-label={`${value}% de afinidade política`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="score-track" cx="50" cy="50" r="44" />
        <circle className="score-fill" cx="50" cy="50" r="44" pathLength="100" strokeDasharray={`${value} 100`} />
      </svg>
      <div><b>{value}<small>%</small></b><span>afinidade política</span></div>
    </div>
  )
}
