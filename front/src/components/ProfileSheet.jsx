import CompatibilityDetails from './CompatibilityDetails'
import Icon from './Icon'
import PhotoGallery from './PhotoGallery'
import Sheet from './Sheet'
import UserActions from './UserActions'

// Perfil completo de outra pessoa, em uma folha: fotos, informações, compatibilidade e
// ações de segurança. Usado em Descobrir e em Matches.
export default function ProfileSheet({ profile, onClose, onDone, preview = false }) {
  const place = [profile.city, profile.state, profile.country].filter(Boolean).join(', ')
  return (
    <Sheet title={profile.username} onClose={onClose} size="lg">
      <div className="ps-grid">
        <PhotoGallery photos={profile.photos} name={profile.username} />
        <div className="ps-info">
          <div className="row between">
            <h3 className="ps-name">
              {profile.username}
              {profile.age != null && <span className="ps-age">, {profile.age}</span>}
            </h3>
            {profile.common_questions > 0 && <span className="chip">{profile.compatibility}% compatível</span>}
          </div>
          <ul className="info-list">
            {place && <li><Icon name="pin" size={20} /> {place}</li>}
            {profile.profession && <li><Icon name="briefcase" size={20} /> {profile.profession}</li>}
            {profile.university && <li><Icon name="school" size={20} /> {profile.university}</li>}
          </ul>
          {profile.description && <p className="ps-bio">{profile.description}</p>}
          {profile.common_questions > 0 && (
            <div className="meter" role="img" aria-label={`${profile.compatibility}% de compatibilidade`}>
              <div style={{ width: `${profile.compatibility}%` }} />
            </div>
          )}
        </div>
        {!preview && <div className="ps-details stack">
          <CompatibilityDetails profile={profile} alwaysOpen />
          <UserActions profile={profile} onDone={(id, res) => onDone?.(id, res)} />
        </div>}
      </div>
    </Sheet>
  )
}
