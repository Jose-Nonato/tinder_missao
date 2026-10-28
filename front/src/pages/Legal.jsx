import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import LegalLinks from '../components/LegalLinks'
import { TERMS_VERSION } from '../legal/consent'

const common = [
  ['Quem é responsável', 'Controlador: [PREENCHER: nome ou razão social]. Identificação e endereço: [PREENCHER]. Contato para privacidade, revogação do consentimento e demais direitos: [PREENCHER: canal do controlador ou encarregado]. Esses dados precisam ser definidos antes da publicação definitiva.'],
  ['Dados e finalidade', 'O Voto a dois aproxima pessoas por afinidade política. O cadastro utiliza nome de usuário, e-mail e senha protegida por hash. O perfil pode incluir fotos, nascimento, gênero, preferências de relacionamento, cidade, estado, país, profissão e descrição. O serviço também processa respostas ao questionário, curtidas, matches, mensagens, bloqueios, denúncias e registros de sessão e segurança. Opiniões políticas, inclusive as inferidas das respostas e da afinidade, são dados pessoais sensíveis. As preferências de relacionamento também podem revelar dados sensíveis.'],
  ['Consentimento e uso de opiniões políticas', 'A base legal proposta neste rascunho é o consentimento, nos termos dos arts. 7º, I, e 11, I, da LGPD. No cadastro, o aceite é acompanhado de declaração explícita e destacada para tratar opiniões políticas e respostas ao questionário com a finalidade específica de calcular afinidade e recomendar pessoas. Esse tratamento é necessário para essa funcionalidade. O registro guarda a versão dos documentos e a data e hora UTC do aceite. Novas finalidades exigem avaliação e, quando aplicável, novo consentimento específico. A revisão jurídica deve confirmar as bases legais de cada operação, inclusive segurança e retenção obrigatória.'],
  ['Compartilhamento e visibilidade', 'Outras pessoas podem visualizar informações públicas do perfil, idade e indicadores de compatibilidade, incluindo temas, perguntas e concordâncias ou divergências. Esses resultados podem revelar opiniões políticas. A data completa de nascimento, o gênero e a preferência de relacionamento não são exibidos no perfil público. Mensagens são destinadas aos participantes da conversa; denúncias podem ser analisadas pela administração. Prestadores de hospedagem, armazenamento e suporte, seus acessos, eventuais transferências internacionais e outras hipóteses de compartilhamento: [PREENCHER após mapear os fornecedores e o fluxo real de dados].'],
  ['Retenção e encerramento', 'Os dados são utilizados enquanto necessários às finalidades informadas. Prazos por categoria, procedimentos de exclusão, tratamento de backups e hipóteses legais de conservação: [PREENCHER]. A revogação deve interromper os tratamentos baseados no consentimento, ressalvadas as hipóteses legais aplicáveis. Revogar o consentimento para opiniões políticas impede a recomendação por afinidade política. O fluxo de atendimento e seus prazos precisam ser definidos e validados antes da publicação definitiva.'],
  ['Seus direitos e como exercê-los', 'Você pode solicitar confirmação do tratamento, acesso, correção, informações sobre compartilhamento, anonimização, bloqueio ou eliminação de dados desnecessários ou tratados irregularmente, além de portabilidade e eliminação nas condições da LGPD. Pode revogar o consentimento, conhecer as consequências da recusa e solicitar revisão de decisões tomadas unicamente por tratamento automatizado que afetem seus interesses. Canal para solicitações e dúvidas: [PREENCHER]. Procedimento de identificação e prazo de resposta: [PREENCHER]. Também é possível peticionar perante a Autoridade Nacional de Proteção de Dados (ANPD).'],
]

const terms = [
  ['Sobre o serviço', 'O Voto a dois é um aplicativo de relacionamento por afinidade política. Recomendações e percentuais de compatibilidade são estimativas baseadas nas respostas ao questionário; não garantem encontros, compatibilidade pessoal ou a conduta de outras pessoas. Critérios de elegibilidade e idade mínima: [PREENCHER e validar antes da publicação definitiva].'],
  ['Conta, convivência e segurança', 'Forneça informações corretas e proteja sua senha. Não se passe por outra pessoa, não publique conteúdo ilícito, não pratique assédio, discriminação, ameaças ou exposição de dados de terceiros. O aplicativo oferece bloqueio e denúncia. Regras de moderação, suspensão, contestação e encerramento de contas: [PREENCHER].'],
  ...common,
  ['Alterações e condições gerais', 'Alterações relevantes devem ser comunicadas de forma clara. Mudanças nas finalidades de tratamento precisam ser avaliadas antes de sua adoção. Condições comerciais, responsabilidades, solução de conflitos e forma de comunicação de alterações: [PREENCHER após revisão jurídica].'],
]
const privacy = [
  ...common,
  ['Segurança e armazenamento no dispositivo', 'O aplicativo usa credenciais de sessão armazenadas no navegador e recursos locais para manter o acesso e o funcionamento da versão instalável. A senha é armazenada como hash no servidor. Inventário de cookies e armazenamento local, controles de acesso, fornecedores, backups e procedimento de resposta a incidentes: [PREENCHER e conferir com a implementação]. Nenhum sistema elimina integralmente os riscos de acesso indevido.'],
  ['Atualizações desta política', 'A versão identifica os textos apresentados no aceite. Mudanças relevantes serão informadas por [PREENCHER: canal]. Finalidades novas ou incompatíveis com o consentimento original precisam de avaliação e, quando exigido, de novo consentimento.'],
]

export default function Legal({ privacy: isPrivacy = false }) {
  const title = isPrivacy ? 'Política de Privacidade' : 'Termos de Uso'
  const sections = isPrivacy ? privacy : terms
  return <main className="legal-page" id="main">
    <header className="legal-header">
      <Logo size={32} />
      <Link to="/login">Entrar</Link>
    </header>
    <article className="legal-document">
      <h1>{title}</h1>
      <div className="notice legal-draft">
        <strong>Rascunho — precisa de revisão jurídica</strong>
        <p>Texto provisório para desenvolvimento. Não é um documento jurídico final. Todos os campos [PREENCHER] precisam ser resolvidos antes da publicação definitiva.</p>
      </div>
      <p className="muted">Versão {TERMS_VERSION} · Atualizado em 28/10/2026.<br />Data de vigência: [PREENCHER após aprovação jurídica].</p>
      <nav className="legal-index" aria-label="Nesta página">
        {sections.map(([heading], index) => <a key={heading} href={`#secao-${index}`}>{heading}</a>)}
      </nav>
      {sections.map(([heading, text], index) => <section key={heading} id={`secao-${index}`}>
        <h2>{heading}</h2><p>{text}</p>
      </section>)}
      <p className="muted">Referência: <a href="https://www2.camara.leg.br/legin/fed/lei/2018/lei-13709-14-agosto-2018-787077-normaatualizada-pl.html" target="_blank" rel="noopener noreferrer">Lei Geral de Proteção de Dados (LGPD)<span className="sr-only"> (abre em nova aba)</span></a>.</p>
    </article>
    <footer><LegalLinks /><Link className="legal-back" to="/register">Ir para o cadastro</Link></footer>
  </main>
}
