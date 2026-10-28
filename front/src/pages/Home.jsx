import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Icon from '../components/Icon'

export default function Home() {
  const { user } = useAuth()
  const isUser = user.role === 'user'
  return (
    <>
      <section className="hero">
        <p className="hero-kicker">Bem-vindo(a) de volta</p>
        <h1 className="hero-title">Olá, {user.username}!</h1>
        <p className="hero-text">
          {isUser
            ? 'Seu perfil está pronto. Veja quem combina com você, com base nas suas respostas.'
            : 'Gerencie as perguntas, os usuários, as denúncias e os pedidos de redefinição de senha.'}
        </p>
        {isUser ? (
          <Link to="/discover" className="cta hero-cta big">
            <Icon name="compass" size={22} /> Descobrir pessoas
          </Link>
        ) : (
          <Link to="/admin/reports" className="cta hero-cta big">
            <Icon name="flag" size={22} /> Ver denúncias
          </Link>
        )}
      </section>

      <ul className="shortcut-grid">
        {isUser && (
          <>
            <li><Link to="/matches" className="shortcut"><Icon name="heart" /> <span>Matches</span></Link></li>
            <li><Link to="/messages" className="shortcut"><Icon name="chat" /> <span>Mensagens</span></Link></li>
          </>
        )}
        <li><Link to="/questionnaire" className="shortcut"><Icon name="clipboard" /> <span>Rever questionário</span></Link></li>
        <li><Link to="/profile" className="shortcut"><Icon name="user" /> <span>Meu perfil</span></Link></li>
      </ul>
    </>
  )
}
