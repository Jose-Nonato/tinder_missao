import { Link } from 'react-router-dom'

export default function Safety() {
  return <section className="safety-page">
    <h1 className="page-title">Central de segurança</h1>
    <p className="lead">Ideias diferentes cabem na conversa. Assédio, não.</p>
    <section><h2>Discorde com respeito</h2><p>Questionar uma ideia política é diferente de atacar uma pessoa. Insultos, ameaças, discriminação e insistência após um “não” ultrapassam esse limite. Você pode encerrar qualquer conversa.</p></section>
    <section><h2>Denuncie ou bloqueie</h2><p>Na conversa, abra “Mais opções” ao lado do nome. No perfil completo de alguém, as ações ficam no final da ficha. Denunciar registra a situação; bloquear impede que vocês apareçam um para o outro.</p><p>Você escolhe se também quer bloquear ao denunciar.</p><div className="row"><Link className="cta" to="/messages">Abrir conversas</Link><Link className="cta secondary" to="/matches">Ver perfis dos matches</Link></div></section>
    <section><h2>Você controla o contato</h2><p>Veja quem você bloqueou e desfaça um bloqueio se quiser.</p><Link className="cta secondary" to="/blocked">Gerenciar bloqueados</Link></section>
    <section><h2>Cuide das suas informações</h2><p>Evite compartilhar endereço, documentos ou dados financeiros. Para um primeiro encontro, prefira um lugar público e avise alguém de confiança.</p></section>
  </section>
}
