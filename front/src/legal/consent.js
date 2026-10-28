// Versão conjunta dos documentos e da declaração de consentimento no cadastro.
// Atualizar junto com back/app/core/terms.py após cada revisão dos textos.
export const TERMS_VERSION = '2026-10-28-draft-1'
export const CONSENT_ERROR = 'Para criar sua conta, você precisa aceitar os termos e consentir com o uso dos dados conforme a declaração de consentimento.'

export function registrationPayload(form, accepted) {
  if (accepted !== true) throw new Error(CONSENT_ERROR)
  return { ...form, accept_terms: true, terms_version: TERMS_VERSION }
}
