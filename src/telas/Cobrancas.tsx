import { useState } from 'react'
import { brl, dataBR, linkWhatsApp } from '../lib/dominio'
import { MODELOS, mensagemTurma, textoDoModelo } from '../lib/mensagens'
import { configDe, useDados } from '../lib/store'
import { Folha, Selo, Vazio } from '../ui'
import type { ClienteComPosicao } from '../App'

/** Clientes agrupadas pela "turma": o dia do mês em que combinaram pagar. */
export function Cobrancas(props: { lista: ClienteComPosicao[]; abrir: (id: string) => void }) {
  const [turmaMsg, setTurmaMsg] = useState<{ dia: number; atrasada: boolean } | null>(null)

  const turmas = new Map<number, ClienteComPosicao[]>()
  for (const x of props.lista) {
    if (!x.pos.saldoCent || !x.pos.dia) continue
    turmas.set(x.pos.dia, [...(turmas.get(x.pos.dia) ?? []), x])
  }
  const dias = [...turmas.keys()].sort((a, b) => a - b)

  if (!dias.length) return <Vazio>Nenhuma fichinha em aberto.</Vazio>

  return (
    <>
      {dias.map((dia) => {
        const clientes = turmas.get(dia)!
        const total = clientes.reduce((s, x) => s + x.pos.saldoCent, 0)
        const atrasadas = clientes.filter((x) => x.pos.atrasoCent > 0).length
        return (
          <section key={dia} className="turma">
            <div className="turma-topo">
              <div>
                <h2>Turma do dia {dia}</h2>
                <small>
                  {clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'} · {brl(total)} em aberto
                </small>
              </div>
              <button className="btn pequeno" onClick={() => setTurmaMsg({ dia, atrasada: atrasadas > 0 })}>
                💬 Mensagem
              </button>
            </div>
            <ul className="lista">
              {clientes.map(({ cliente, pos }) => (
                <li key={cliente.id}>
                  <button className="linha" onClick={() => props.abrir(cliente.id)}>
                    <span className="linha-principal">
                      <b>{cliente.nome}</b>
                      <small>
                        {pos.atrasoCent > 0 ? (
                          <Selo tipo="alerta">em atraso desde {dataBR(pos.proxima!.vencimento)}</Selo>
                        ) : (
                          <>próxima {dataBR(pos.proxima!.vencimento)}</>
                        )}
                      </small>
                    </span>
                    <span className={`linha-valor ${pos.atrasoCent ? 'alerta' : ''}`}>
                      {brl(pos.atrasoCent || pos.proxima!.restanteCent)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
      {turmaMsg && <MensagemTurma {...turmaMsg} aoFechar={() => setTurmaMsg(null)} />}
    </>
  )
}

function MensagemTurma(props: { dia: number; atrasada: boolean; aoFechar: () => void }) {
  const config = configDe(useDados())
  const modelos = MODELOS.filter((m) => m.tipo === 'turma')
  const inicial = props.atrasada ? 'turma_atraso' : 'turma_lembrete'
  const montar = (id: string) =>
    mensagemTurma(textoDoModelo(modelos.find((m) => m.id === id)!, config), props.dia, config)
  const [modelo, setModelo] = useState(inicial)
  const [texto, setTexto] = useState(() => montar(inicial))
  const [copiado, setCopiado] = useState(false)

  return (
    <Folha titulo={`Turma do dia ${props.dia}`} aoFechar={props.aoFechar}>
      <div className="chips">
        {modelos.map((m) => (
          <button
            key={m.id}
            className={`chip ${modelo === m.id ? 'ativo' : ''}`}
            onClick={() => {
              setModelo(m.id)
              setTexto(montar(m.id))
            }}
          >
            {m.titulo.replace('Turma: ', '')}
          </button>
        ))}
      </div>
      <textarea className="mensagem" rows={10} value={texto} onChange={(e) => setTexto(e.target.value)} />
      <a className="btn primario largo" href={linkWhatsApp('', texto)} target="_blank" rel="noreferrer">
        Abrir no WhatsApp
      </a>
      <p className="dica">O WhatsApp vai pedir para você escolher o grupo ou a lista de transmissão.</p>
      <button
        className="btn largo"
        onClick={async () => {
          await navigator.clipboard.writeText(texto)
          setCopiado(true)
        }}
      >
        {copiado ? 'Copiado ✓' : 'Copiar texto'}
      </button>
    </Folha>
  )
}
