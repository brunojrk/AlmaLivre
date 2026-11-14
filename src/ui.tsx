import { useEffect, type ReactNode } from 'react'

/** Painel que sobe de baixo da tela (formulários e confirmações). */
export function Folha(props: { titulo: string; aoFechar: () => void; children: ReactNode }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])
  return (
    <div className="fundo-folha" onClick={props.aoFechar}>
      <div className="folha" role="dialog" aria-label={props.titulo} onClick={(e) => e.stopPropagation()}>
        <div className="folha-topo">
          <h2>{props.titulo}</h2>
          <button className="fechar" onClick={props.aoFechar} aria-label="Fechar">
            ✕
          </button>
        </div>
        {props.children}
      </div>
    </div>
  )
}

export function Campo(props: { rotulo: string; dica?: string; children: ReactNode }) {
  return (
    <label className="campo">
      <span className="rotulo">{props.rotulo}</span>
      {props.children}
      {props.dica && <span className="dica">{props.dica}</span>}
    </label>
  )
}

export function CampoValor(props: { valor: string; aoMudar: (v: string) => void; autoFocus?: boolean }) {
  return (
    <div className="valor-input">
      <span>R$</span>
      <input
        inputMode="decimal"
        placeholder="0,00"
        value={props.valor}
        autoFocus={props.autoFocus}
        onChange={(e) => props.aoMudar(e.target.value)}
      />
    </div>
  )
}

export function Selo(props: { tipo: 'ok' | 'alerta' | 'neutro' | 'info'; children: ReactNode }) {
  return <span className={`selo selo-${props.tipo}`}>{props.children}</span>
}

export function Vazio(props: { children: ReactNode }) {
  return <p className="vazio">{props.children}</p>
}
