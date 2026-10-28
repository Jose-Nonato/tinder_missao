const BASE = import.meta.env.VITE_API_URL ?? '/api'

const store = {
  get access() { return localStorage.getItem('access_token') },
  get refresh() { return localStorage.getItem('refresh_token') },
  set({ access_token, refresh_token }) {
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
  },
  clear() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  },
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// Mensagem legível a partir do corpo de erro do FastAPI (string ou lista de 422)
function errorMessage(body, fallback) {
  const d = body?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map((e) => e.msg.replace(/^Value error, /, '')).join('; ')
  return fallback
}

async function raw(path, { method = 'GET', body, token } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, errorMessage(data, `Erro ${res.status}`))
  return data
}

// Renova o par de tokens. Compartilha a chamada entre requisições simultâneas,
// já que o refresh token é de uso único no backend.
let refreshing = null
function refreshTokens() {
  if (!refreshing) {
    refreshing = raw('/auth/refresh', { method: 'POST', body: { refresh_token: store.refresh } })
      .then((t) => { store.set(t) })
      .finally(() => { refreshing = null })
  }
  return refreshing
}

let onSessionExpired = () => {}
export const setSessionExpiredHandler = (fn) => { onSessionExpired = fn }

// Requisição autenticada: em 401 tenta renovar o token uma vez e repete.
async function authed(path, opts = {}) {
  try {
    return await raw(path, { ...opts, token: store.access })
  } catch (err) {
    if (err.status === 403 && err.message.startsWith('Conta suspensa')) {
      store.clear()
      onSessionExpired()
      throw err
    }
    if (err.status !== 401 || !store.refresh) throw err
    try {
      await refreshTokens()
    } catch {
      store.clear()
      onSessionExpired()
      throw err
    }
    return raw(path, { ...opts, token: store.access })
  }
}

// URLs de upload local vêm relativas (/uploads/x.png); as externas (http...) ficam como estão.
export const assetUrl = (url) => (!url || /^https?:\/\//.test(url) ? url : BASE + url)

// Upload multipart; reaproveita a renovação de token de `authed`.
async function upload(path, file) {
  const form = new FormData()
  form.append('file', file)
  const send = async () => {
    const res = await fetch(BASE + path, {
      method: 'POST',
      headers: { Authorization: `Bearer ${store.access}` },
      body: form,
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new ApiError(res.status, errorMessage(data, `Erro ${res.status}`))
    return data
  }
  try {
    return await send()
  } catch (err) {
    if (err.status !== 401 || !store.refresh) throw err
    try {
      await refreshTokens()
    } catch {
      store.clear()
      onSessionExpired()
      throw err
    }
    return send()
  }
}

// Endereço do WebSocket do chat, derivado da mesma base da API.
export const wsUrl = () => {
  const base = /^https?:\/\//.test(BASE) ? BASE : location.origin + BASE
  return base.replace(/^http/, 'ws') + '/ws'
}

export const api = {
  hasSession: () => Boolean(store.access),
  register: (data) => raw('/auth/register', { method: 'POST', body: data }),
  async login(email, password) {
    store.set(await raw('/auth/login', { method: 'POST', body: { email, password } }))
  },
  // Logout de verdade: avisa o servidor (que encerra a sessão e o chat) e só então limpa o local.
  async logout() {
    try {
      await authed('/auth/logout', { method: 'POST' })
    } catch {
      // sem rede ou sessão já encerrada: o importante é limpar o que está neste navegador
    }
    store.clear()
  },
  async logoutAll() {
    await authed('/auth/logout-all', { method: 'POST' })
    store.clear()
  },
  forgotPassword: (email, contact) =>
    raw('/auth/forgot-password', { method: 'POST', body: { email, contact } }),
  resetPassword: (token, newPassword) =>
    raw('/auth/reset-password', { method: 'POST', body: { token, new_password: newPassword } }),
  me: () => authed('/auth/me'),

  // perguntas
  activeQuestions: () => authed('/questions/active'),
  listQuestions: () => authed('/questions'),
  createQuestion: (q) => authed('/questions', { method: 'POST', body: q }),
  updateQuestion: (code, changes) => authed(`/questions/${code}`, { method: 'PATCH', body: changes }),
  deleteQuestion: (code) => authed(`/questions/${code}`, { method: 'DELETE' }),

  uploadImage: (file) => upload('/uploads', file),
  uploadPhoto: (file) => upload('/uploads/photos', file),
  myProfile: () => authed('/users/me/profile'),
  saveProfile: (profile) => authed('/users/me/profile', { method: 'PUT', body: profile }),

  // respostas do usuário logado
  myAnswers: () => authed('/users/me/answers'),
  saveAnswers: (answers) => authed('/users/me/answers', { method: 'PUT', body: { answers } }),

  // Garante um access token válido (renova se preciso) para autenticar o WebSocket.
  freshToken: async () => {
    await authed('/auth/me')
    return store.access
  },

  // chat
  conversations: () => authed('/conversations'),
  history: (userId, before, limit = 50) => {
    const params = new URLSearchParams({ limit })
    if (before) params.set('before', before)
    return authed(`/conversations/${userId}/messages?${params}`)
  },
  markRead: (userId) => authed(`/conversations/${userId}/read`, { method: 'POST' }),

  // descobrir pessoas
  recommendations: () => authed('/recommendations'),
  swipe: (userId, action) => authed('/swipes', { method: 'POST', body: { user_id: userId, action } }),
  matches: () => authed('/matches'),

  // recuperação de senha (admin)
  passwordResets: (status) => authed(`/password-resets${status ? `?status=${status}` : ''}`),
  passwordResetSummary: () => authed('/password-resets/summary'),
  issueResetToken: (id) => authed(`/password-resets/${id}/issue`, { method: 'POST' }),
  dismissReset: (id) => authed(`/password-resets/${id}/dismiss`, { method: 'POST' }),

  // segurança
  blockUser: (userId) => authed('/blocks', { method: 'POST', body: { user_id: userId } }),
  unblockUser: (userId) => authed(`/blocks/${userId}`, { method: 'DELETE' }),
  blockedUsers: () => authed('/blocks'),
  reportUser: (userId, reason, details, block) =>
    authed('/reports', { method: 'POST', body: { user_id: userId, reason, details, block } }),
  listReports: (status, reason) => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (reason) params.set('reason', reason)
    const qs = params.toString()
    return authed(`/reports${qs ? `?${qs}` : ''}`)
  },
  reportsSummary: () => authed('/reports/summary'),
  reportDetail: (id) => authed(`/reports/${id}`),
  setReportStatus: (id, status, note = '') =>
    authed(`/reports/${id}`, { method: 'PATCH', body: { status, note } }),
  suspendUser: (userId, reason) =>
    authed(`/users/${userId}/suspension`, { method: 'POST', body: { reason } }),
  reactivateUser: (userId) => authed(`/users/${userId}/suspension`, { method: 'DELETE' }),

  // usuários (admin)
  listUsers: () => authed('/users'),
  setRole: (id, role) => authed(`/users/${id}/role`, { method: 'PATCH', body: { role } }),
}
