const roots = {
  '/': 'Início', '/discover': 'Descobrir', '/matches': 'Matches',
  '/messages': 'Mensagens', '/profile': 'Meu perfil',
  '/admin/questions': 'Perguntas', '/admin/users': 'Usuários',
  '/admin/reports': 'Denúncias',
}
const details = {
  '/profile/photos': 'Suas fotos', '/profile/about': 'Sobre você',
  '/profile/data': 'Seus dados', '/profile/preferences': 'Suas preferências',
  '/profile/account': 'Sua conta', '/profile/preview': 'Prévia do perfil',
  '/admin/password-resets': 'Redefinição de senha',
  '/questionnaire': 'Questionário', '/safety': 'Central de segurança', '/blocked': 'Bloqueados',
  '/termos': 'Termos de Uso', '/privacidade': 'Política de Privacidade',
  '/apoie': 'Apoie o projeto', '/register': 'Criar conta',
  '/forgot-password': 'Recuperar senha', '/reset-password': 'Redefinir senha',
}
export function screenFor(path) {
  if (roots[path]) return { title: roots[path], root: true, parent: null }
  if (path.startsWith('/register/')) return { title: details['/' + path.split('/')[2]] || 'Documentos', parent: '/register', root: false }
  let parent = '/profile'
  let title = details[path] || 'Detalhes'
  if (/^\/(discover|matches|messages)\//.test(path)) {
    parent = `/${path.split('/')[1]}`
    title = path.startsWith('/messages/') ? 'Conversa' : 'Perfil e afinidade'
  } else if (path === '/admin/password-resets') {
    parent = '/profile'
  } else if (path.startsWith('/admin/')) {
    parent = '/' + path.split('/').slice(1, 3).join('/')
    title = path.startsWith('/admin/reports/') ? 'Analisar denúncia' : path.endsWith('/new') ? 'Nova pergunta' : 'Editar pergunta'
  } else if (path.startsWith('/questionnaire/')) {
    parent = '/questionnaire'
    title = 'Responder pergunta'
  } else if (['/termos', '/privacidade'].includes(path)) parent = '/register'
  else if (['/register', '/forgot-password', '/reset-password'].includes(path)) parent = '/login'
  return { title, parent, root: false }
}
export const canGoBack = (state) => Number.isInteger(state?.idx) && state.idx > 0
