import { lazy, Suspense } from 'react'

const SelectControl = lazy(() => import('./SelectControl'))

export default function Select(props) {
  return <Suspense fallback={<div className="field" aria-busy="true"><span>{props.label}</span><span className="select-trigger" role="status">Carregando opções…</span></div>}><SelectControl {...props} /></Suspense>
}
