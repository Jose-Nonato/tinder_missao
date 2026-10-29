// Estados e municípios do Brasil pela API de Localidades do IBGE (pública, sem chave).
// As respostas ficam em memória: cada lista é baixada uma vez por sessão.
const IBGE = 'https://servicodados.ibge.gov.br/api/v1/localidades'
const cache = new Map()

function load(path, pick) {
  if (!cache.has(path)) {
    const request = fetch(IBGE + path)
      .then((res) => {
        if (!res.ok) throw new Error(`IBGE ${res.status}`)
        return res.json()
      })
      .then((data) => data.map(pick))
    cache.set(path, request)
    request.catch(() => cache.delete(path)) // falhou: a próxima tentativa busca de novo
  }
  return cache.get(path)
}

export const COUNTRY = 'Brasil'

export const fetchStates = () => load('/estados?orderBy=nome', (s) => ({ uf: s.sigla, name: s.nome }))

export const fetchCities = (uf) => load(`/estados/${uf}/municipios?orderBy=nome`, (c) => c.nome)

// Compara nomes ignorando acentos e maiúsculas ("sao paulo" = "São Paulo").
export const sameName = (a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }) === 0
