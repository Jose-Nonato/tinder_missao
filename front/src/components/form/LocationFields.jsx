import { useEffect, useEffectEvent, useState } from 'react'
import Select from './Select'
import { COUNTRY, fetchCities, fetchStates, sameName } from '../../api/locations'

const LOAD_ERROR = 'Não foi possível carregar a lista de localidades.'

// País, estado e cidade só por seleção: estado (sigla) e cidade vêm do IBGE.
// Perfis antigos, digitados à mão, são ajustados para o nome oficial quando há correspondência;
// sem correspondência, o campo volta vazio para a pessoa escolher de novo.
export default function LocationFields({ city, state, country, onChange }) {
  const [states, setStates] = useState(null)
  const [cities, setCities] = useState({})
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const change = useEffectEvent((changes) => onChange(changes))

  useEffect(() => { if (country !== COUNTRY) change({ country: COUNTRY }) }, [country])

  useEffect(() => {
    fetchStates().then(setStates).catch(() => setError(LOAD_ERROR))
  }, [attempt])

  useEffect(() => {
    if (!states || !state || states.some((s) => s.uf === state)) return
    const match = states.find((s) => sameName(s.uf, state) || sameName(s.name, state))
    change(match ? { state: match.uf } : { state: '', city: '' })
  }, [states, state])

  const uf = states?.some((s) => s.uf === state) ? state : ''
  useEffect(() => {
    if (!uf) return  // a lista fica em cache; repetir a chamada não baixa de novo
    fetchCities(uf).then((list) => setCities((cur) => ({ ...cur, [uf]: list }))).catch(() => setError(LOAD_ERROR))
  }, [uf, attempt])

  const list = uf ? cities[uf] : null
  useEffect(() => {
    if (!list || !city || list.includes(city)) return
    change({ city: list.find((c) => sameName(c, city)) ?? '' })
  }, [list, city])

  const retry = () => { setError(''); setAttempt((n) => n + 1) }

  return <>
    <div className="field-pair">
      <Select label="País" value={COUNTRY} required onChange={() => {}}><option value={COUNTRY}>Brasil</option></Select>
      <Select label="Estado" value={uf} required onChange={(e) => onChange({ state: e.target.value, city: '' })}>
        <option value="" disabled>{states ? 'Selecione' : 'Carregando…'}</option>
        {states?.map((s) => <option key={s.uf} value={s.uf}>{s.name}</option>)}
      </Select>
    </div>
    <Select label="Cidade" searchable value={list?.includes(city) ? city : ''} required onChange={(e) => onChange({ city: e.target.value })}>
      <option value="" disabled>{!uf ? 'Escolha o estado primeiro' : list ? 'Selecione' : 'Carregando…'}</option>
      {list?.map((c) => <option key={c} value={c}>{c}</option>)}
    </Select>
    {error && <p className="error" role="alert">{error} <button type="button" className="link" onClick={retry}>Tentar novamente</button></p>}
  </>
}
