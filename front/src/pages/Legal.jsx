import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import LegalLinks from '../components/LegalLinks'
import { TERMS_VERSION } from '../legal/consent'

const common = [
  ['Quem é responsável', 'A Ducks tech é um grupo independente de desenvolvimento, sem fins lucrativos e sem CNPJ, responsável pelo Voto a dois. O único canal de atendimento, privacidade e direitos do titular é duckstech@hotmail.com.'],
  ['Independência e uso dos dados', 'O Voto a dois é independente e não tem vínculo com partidos políticos. Nenhum partido ou terceiro recebe acesso à base de dados para fins políticos, propaganda ou marketing. Os dados não são usados para comunicação política, propaganda ou marketing, nem vendidos. Isso não significa sigilo das informações públicas do perfil e das fotos: a visibilidade entre pessoas e o acesso técnico dos fornecedores estão descritos abaixo.'],
  ['Dados e finalidade', 'O Voto a dois aproxima pessoas por afinidade política. O cadastro utiliza nome de usuário, e-mail e senha protegida por hash. O perfil pode incluir fotos, nascimento, gênero, preferências de relacionamento, cidade, estado, país, profissão, universidade e descrição. O serviço também processa respostas ao questionário, curtidas, matches, mensagens, bloqueios, denúncias e registros de sessão e segurança. Opiniões políticas, inclusive as inferidas das respostas e da afinidade, são dados pessoais sensíveis. As preferências de relacionamento também podem revelar dados sensíveis.'],
  ['Consentimento e uso de opiniões políticas', 'A base legal proposta neste rascunho é o consentimento, nos termos dos arts. 7º, I, e 11, I, da LGPD. No cadastro, o aceite é acompanhado de declaração explícita e destacada para tratar opiniões políticas e respostas ao questionário com a finalidade específica de calcular afinidade e recomendar pessoas. Esse tratamento é necessário para essa funcionalidade. O registro guarda a versão dos documentos e a data e hora UTC do aceite. Novas finalidades exigem avaliação e, quando aplicável, novo consentimento específico. A revisão jurídica deve confirmar as bases legais de cada operação, inclusive segurança e retenção obrigatória.'],
  ['Compartilhamento e visibilidade', 'Outras pessoas podem visualizar informações públicas do perfil, idade e indicadores de compatibilidade, incluindo temas, perguntas e concordâncias ou divergências. Esses resultados podem revelar opiniões políticas. A data completa de nascimento, o gênero e a preferência de relacionamento não são exibidos no perfil público. Mensagens são destinadas aos participantes da conversa; denúncias podem ser analisadas pela administração. As fotos possuem URL pública: quem tiver o endereço pode abri-las sem login. As respostas de upload indicam cache de até um ano; cópias já armazenadas em navegadores ou por terceiros podem persistir após a remoção da foto. Não publique imagens que precisem permanecer privadas. Os fornecedores técnicos são Render (hospedagem da aplicação e da API), MongoDB (banco de dados) e Supabase (armazenamento de fotos). Eles tratam dados apenas para prestar esses serviços e podem processá-los fora do Brasil, conforme sua infraestrutura.'],
  ['Retenção e encerramento', 'Os dados são mantidos enquanto a conta existir, até que o titular solicite sua exclusão. Após o pedido, os dados são excluídos. Para solicitar revogação do consentimento ou exclusão da conta, envie um e-mail a duckstech@hotmail.com; não existe função de revogação ou exclusão de conta no aplicativo. A revogação deve interromper os tratamentos baseados no consentimento, ressalvadas as hipóteses legais aplicáveis. Revogar o consentimento para opiniões políticas impede a recomendação por afinidade política.'],
  ['Seus direitos e como exercê-los', 'Você pode solicitar confirmação do tratamento, acesso, correção, informações sobre compartilhamento, anonimização, bloqueio ou eliminação de dados desnecessários ou tratados irregularmente, além de portabilidade e eliminação nas condições da LGPD. Pode revogar o consentimento, conhecer as consequências da recusa e solicitar revisão de decisões tomadas unicamente por tratamento automatizado que afetem seus interesses. Canal para solicitações, exclusão de conta, revogação e dúvidas: duckstech@hotmail.com. Respondemos aos pedidos em até 3 dias. Podemos pedir informações mínimas, como o e-mail cadastrado, para confirmar que o pedido vem do titular da conta. Também é possível peticionar perante a Autoridade Nacional de Proteção de Dados (ANPD).'],
]

const terms = [
  ['Sobre o serviço', 'O Voto a dois é um aplicativo gratuito de relacionamento por afinidade política, sem fins comerciais, mantido pela Ducks tech. Recomendações e percentuais de compatibilidade são estimativas baseadas nas respostas ao questionário; não garantem encontros, compatibilidade pessoal ou a conduta de outras pessoas. O aplicativo exige idade mínima de 18 anos.'],
  ['Conta, convivência e segurança', 'Forneça informações corretas e proteja sua senha. Não se passe por outra pessoa, não publique conteúdo ilícito, não pratique assédio, discriminação, ameaças ou exposição de dados de terceiros. O aplicativo oferece bloqueio e denúncia. As denúncias são analisadas pela equipe de desenvolvimento da Ducks tech, que pode advertir, suspender ou encerrar contas que violem estes termos. Contestações podem ser enviadas a duckstech@hotmail.com.'],
  ['Doações voluntárias', 'O serviço é gratuito. Doações à Ducks tech para o Voto a dois são voluntárias, sem contrapartida e não reembolsáveis, ressalvados os direitos previstos em lei. Não dão vantagens, prioridade ou recursos extras no app. Os recursos custeiam manutenção técnica, hospedagem e banco de dados. A doação é ao projeto independente, não a um partido político. As doações podem ser processadas por intermediador de pagamentos. A página Apoie o projeto apresenta os meios disponíveis; enquanto não houver dados configurados, não há meio de doação divulgado pelo app. Condições e identificação do recebedor: [PREENCHER e validar antes de habilitar as doações].'],
  ...common,
  ['Alterações e condições gerais', 'Alterações relevantes serão comunicadas por aviso dentro do aplicativo. Mudanças nas finalidades de tratamento precisam ser avaliadas antes de sua adoção. O serviço é gratuito.'],
]
const privacy = [
  ...common,
  ['Segurança dos dados', 'Adotamos medidas técnicas para proteger os dados; a senha é armazenada de forma protegida.'],
  ['Atualizações desta política', 'A versão identifica os textos apresentados no aceite. Mudanças relevantes serão informadas por aviso dentro do aplicativo. Finalidades novas ou incompatíveis com o consentimento original precisam de avaliação e, quando exigido, de novo consentimento.'],
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
        <p>Texto provisório. A seção de doações ainda está pendente e a revisão jurídica é recomendada antes da publicação definitiva.</p>
      </div>
      <p className="muted">Versão {TERMS_VERSION} · Atualizado em 28/10/2026.<br />Data de vigência: 28/10/2026.</p>
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
