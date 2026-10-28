import { useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import LegalLinks from '../components/LegalLinks'
import { useAuth } from '../auth/AuthContext'
import { donationConfig } from '../legal/donation'
import '../styles/support.css'

const { pixKey, qrUrl } = donationConfig(import.meta.env)

export default function Support() {
  const { user } = useAuth()
  const [feedback, setFeedback] = useState('')
  const [qrFailed, setQrFailed] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pixKey)
      setFeedback('Copiado')
    } catch {
      setFeedback('Não foi possível copiar. Selecione a chave acima e copie manualmente.')
    }
  }
  return <main className="legal-page support-page" id="main">
    <header className="legal-header">
      <Logo size={32} />
      <Link to={user ? '/' : '/login'}>{user ? 'Voltar ao início' : 'Entrar'}</Link>
    </header>
    <article className="legal-document">
      <h1>Apoie o projeto</h1>
      <p className="support-lead">Boas conexões. Um projeto que podemos manter juntos.</p>
      <p>O Voto a dois é gratuito e sem fins lucrativos. Somos a Ducks tech, um grupo independente de desenvolvimento, sem CNPJ. Sua doação ajuda a pagar a hospedagem e o banco de dados que mantêm o aplicativo no ar.</p>
      <section className="support-payment" aria-labelledby="donation-title">
        <h2 id="donation-title">{pixKey || qrUrl ? 'Contribua com o projeto' : 'Em breve'}</h2>
        {!pixKey && !qrUrl && <p>Estamos preparando uma forma de receber seu apoio. Quando estiver pronta, os dados para doação aparecerão aqui. Enquanto isso, aproveite o app: ele continua gratuito.</p>}
        {qrUrl && (qrFailed
          ? <p role="status">Não foi possível carregar o QR code.{pixKey ? ' Use a chave Pix abaixo.' : ' Tente novamente mais tarde.'}</p>
          : <img className="support-qr" src={qrUrl} alt="QR code para doação ao Voto a dois" width="256" height="256" onError={() => setQrFailed(true)} />)}
        {pixKey && <div className="support-pix">
          <label htmlFor="donation-pix">Chave Pix</label>
          <input id="donation-pix" value={pixKey} readOnly onFocus={e => e.target.select()} />
          <button type="button" onClick={copy}>Copiar chave Pix</button>
          <p className="support-feedback" role="status" aria-live="polite">{feedback}</p>
        </div>}
        {(pixKey || qrUrl) && <p className="muted">Confira os dados do destinatário no seu banco antes de confirmar. Escolha o valor com que se sente confortável.</p>}
      </section>
      <section>
        <h2>Seu apoio mantém a estrutura</h2>
        <p>A doação é voluntária, sem contrapartida e não reembolsável, ressalvados os direitos previstos em lei. Não dá vantagens, prioridade ou recursos extras no aplicativo. Os recursos são destinados à manutenção técnica, incluindo hospedagem e banco de dados.</p>
        <p>Você apoia um projeto independente, sem vínculo com partidos políticos. A doação é ao projeto, não a um partido.</p>
      </section>
      <section>
        <h2>Vamos conversar?</h2>
        <p>Dúvidas sobre o projeto ou sobre doações? Fale com a Ducks tech: <a href="mailto:duckstech@hotmail.com">duckstech@hotmail.com</a>.</p>
      </section>
    </article>
    <footer><LegalLinks /></footer>
  </main>
}
