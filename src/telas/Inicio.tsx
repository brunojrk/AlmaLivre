import { brl, dataBR, hojeISO, somarDias } from '../lib/dominio'
import { useDados } from '../lib/store'
import { Selo, Vazio } from '../ui'
import type { Aba, ClienteComPosicao } from '../App'

export function Inicio(props: {
  lista: ClienteComPosicao[]
  abrir: (id: string) => void
  irPara: (a: Aba) => void
}) {
  const { recebimentos } = useDados()
  const hoje = hojeISO()
  const em7 = somarDias(hoje, 7)
  const mes = hoje.slice(0, 7)

  const total = props.lista.reduce((s, x) => s + x.pos.saldoCent, 0)
  const atrasadas = props.lista.filter((x) => x.pos.atrasoCent > 0)
  const atraso = atrasadas.reduce((s, x) => s + x.pos.atrasoCent, 0)
  const recebidoMes = recebimentos
    .filter((r) => r.data.startsWith(mes))
    .reduce((s, r) => s + Math.round(r.valor * 100), 0)

  const proximas = props.lista
    .flatMap((x) =>
      x.pos.parcelas
        .filter((p) => p.restanteCent > 0 && p.vencimento >= hoje && p.vencimento <= em7)
        .map((p) => ({ ...x, p })),
    )
    .sort((a, b) => a.p.vencimento.localeCompare(b.p.vencimento))
  const aVencer = proximas.reduce((s, x) => s + x.p.restanteCent, 0)

  if (!props.lista.length) {
    return (
      <section className="boas-vindas">
        <h1>Bem-vinda, alma livre! 🌿</h1>
        <p>Comece cadastrando sua primeira cliente e a fichinha dela.</p>
        <button className="btn primario" onClick={() => props.irPara('clientes')}>
          Cadastrar cliente
        </button>
      </section>
    )
  }

  return (
    <>
      <section className="cartao destaque">
        <span className="rotulo">Total a receber nas fichinhas</span>
        <strong className="numero-grande">{brl(total)}</strong>
        <span className="sub">{props.lista.filter((x) => x.pos.saldoCent > 0).length} clientes com saldo</span>
      </section>

      <div className="grade-3">
        <button className="cartao mini" onClick={() => props.irPara('cobrancas')}>
          <span className="rotulo">Em atraso</span>
          <strong className={atraso ? 'alerta' : ''}>{brl(atraso)}</strong>
          <span className="sub">{atrasadas.length === 1 ? '1 cliente' : `${atrasadas.length} clientes`}</span>
        </button>
        <div className="cartao mini">
          <span className="rotulo">Vence em 7 dias</span>
          <strong>{brl(aVencer)}</strong>
          <span className="sub">{proximas.length === 1 ? '1 parcela' : `${proximas.length} parcelas`}</span>
        </div>
        <div className="cartao mini">
          <span className="rotulo">Recebido no mês</span>
          <strong className="ok">{brl(recebidoMes)}</strong>
          <span className="sub">fichinhas</span>
        </div>
      </div>

      <h2 className="titulo-secao">Em atraso</h2>
      {atrasadas.length ? (
        <ul className="lista">
          {[...atrasadas]
            .sort((a, b) => b.pos.atrasoCent - a.pos.atrasoCent)
            .map((x) => (
              <li key={x.cliente.id}>
                <button className="linha" onClick={() => props.abrir(x.cliente.id)}>
                  <span className="linha-principal">
                    <b>{x.cliente.nome}</b>
                    <small>desde {dataBR(x.pos.proxima!.vencimento)}</small>
                  </span>
                  <span className="linha-valor alerta">{brl(x.pos.atrasoCent)}</span>
                </button>
              </li>
            ))}
        </ul>
      ) : (
        <Vazio>Ninguém em atraso. 💚</Vazio>
      )}

      <h2 className="titulo-secao">Vencem nos próximos 7 dias</h2>
      {proximas.length ? (
        <ul className="lista">
          {proximas.map((x) => (
            <li key={x.p.id}>
              <button className="linha" onClick={() => props.abrir(x.cliente.id)}>
                <span className="linha-principal">
                  <b>{x.cliente.nome}</b>
                  <small>
                    {x.p.vencimento === hoje ? <Selo tipo="info">vence hoje</Selo> : `dia ${dataBR(x.p.vencimento)}`}
                  </small>
                </span>
                <span className="linha-valor">{brl(x.p.restanteCent)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Vazio>Nenhuma parcela vence esta semana.</Vazio>
      )}
    </>
  )
}
