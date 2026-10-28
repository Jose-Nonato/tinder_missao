// Captura também o evento que chega na tela de login, antes de Layout montar.
let offer = null
const listeners = new Set()
const publish = value => { offer = value; listeners.forEach(listener => listener()) }
export const subscribeInstall = listener => { listeners.add(listener); return () => listeners.delete(listener) }
export const getInstallOffer = () => offer
export const clearInstallOffer = () => publish(null)
if (import.meta.env.PROD) {
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); publish(event) })
  window.addEventListener('appinstalled', clearInstallOffer)
}
