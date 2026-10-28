import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, assetUrl } from '../api/client'
import Icon from '../components/Icon'
import ProfileSheet from '../components/ProfileSheet'

export default function Matches() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    api.matches()
      .then(setMatches)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <h1 className="page-title">Matches</h1>
      {error && <p className="error" role="alert">{error}</p>}

      {loading ? (
        <ul className="match-grid" aria-busy="true" aria-label="Carregando matches">
          {[0, 1, 2, 3].map((i) => <li key={i} className="skeleton match-skeleton" />)}
        </ul>
      ) : matches.length === 0 && !error ? (
        <div className="empty-state">
          <span className="empty-ico"><Icon name="heart" size={36} /></span>
          <h2>Nenhum match ainda</h2>
          <p>Quando você e outra pessoa se curtirem, o match aparece aqui.</p>
          <Link to="/discover" className="cta">Descobrir pessoas</Link>
        </div>
      ) : (
        <>
          <p className="muted match-count">{matches.length} {matches.length === 1 ? 'match' : 'matches'}</p>
          <ul className="match-grid">
            {matches.map(({ profile, matched_at }) => (
              <li key={profile.id} className="match-tile">
                <Link to={`/messages/${profile.id}`} className="match-link" aria-label={`Conversar com ${profile.username}`}>
                  {profile.photos?.[0] ? (
                    <img src={assetUrl(profile.photos[0])} alt="" loading="lazy" draggable={false} />
                  ) : (
                    <span className="match-initial" aria-hidden="true">{profile.username[0].toUpperCase()}</span>
                  )}
                  <span className="match-shade" />
                  <span className="match-meta">
                    <b>{profile.username}{profile.age != null && `, ${profile.age}`}</b>
                    <small>desde {new Date(matched_at).toLocaleDateString('pt-BR')}</small>
                  </span>
                  {profile.common_questions > 0 && <span className="chip match-chip">{profile.compatibility}%</span>}
                </Link>
                <button
                  type="button"
                  className="icon-btn tile-more"
                  onClick={() => setSelected(profile)}
                  aria-label={`Mais sobre ${profile.username}`}
                >
                  <Icon name="more" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {selected && (
        <ProfileSheet
          profile={selected}
          onClose={() => setSelected(null)}
          onDone={(id, { blocked }) => {
            setSelected(null)
            if (blocked) setMatches((list) => list.filter((m) => m.profile.id !== id))
          }}
        />
      )}
    </>
  )
}
