import { useMemo, useState } from 'react'
import { calcularPosicao, type Cliente, type Posicao } from './lib/dominio'
import { sincronizar, useDados } from './lib/store'
import { Inicio } from './telas/Inicio'
import { Clientes } from './telas/Clientes'
import { Ficha } from './telas/Ficha'
import { Cobrancas } from './telas/Cobrancas'
import { Ajustes } from './telas/Ajustes'

export type Aba = 'inicio' | 'clientes' | 'cobrancas' | 'ajustes'

export interface ClienteComPosicao {
  cliente: Cliente
  pos: Posicao
}

const ABAS: { id: Aba; nome: string; icone: string }[] = [
  { id: 'inicio', nome: 'Início', icone: '🏠' },
  { id: 'clientes', nome: 'Clientes', icone: '👩' },
  { id: 'cobrancas', nome: 'Cobranças', icone: '📅' },
  { id: 'ajustes', nome: 'Ajustes', icone: '⚙️' },
]

const TEXTO_SITUACAO = {
  local: 'Só neste aparelho',
  ok: 'Salvo na planilha',
  enviando: 'Salvando…',
  pendente: 'Aguardando envio',
  erro: 'Sem conexão — toque para tentar',
}

export function App() {
  const dados = useDados()
  const [aba, setAba] = useState<Aba>('inicio')
  const [clienteId, setClienteId] = useState<string | null>(null)

  const lista = useMemo<ClienteComPosicao[]>(() => {
    return dados.clientes
      .map((cliente) => ({
        cliente,
        pos: calcularPosicao(
          dados.parcelas.filter((p) => p.cliente_id === cliente.id),
          dados.recebimentos.filter((r) => r.cliente_id === cliente.id),
        ),
      }))
      .sort((a, b) => a.cliente.nome.localeCompare(b.cliente.nome, 'pt-BR'))
  }, [dados.clientes, dados.parcelas, dados.recebimentos])

  const aberta = clienteId ? lista.find((x) => x.cliente.id === clienteId) : undefined
  const abrir = (id: string) => {
    setClienteId(id)
    window.scrollTo(0, 0)
  }

  return (
    <div className="app">
      <header className="topo">
        <div className="marca">
          <span className="marca-nome">Alma Livre</span>
          <span className="marca-sub">ateliê</span>
        </div>
        <button className={`situacao situacao-${dados.situacao}`} onClick={() => void sincronizar()}>
          <i /> {TEXTO_SITUACAO[dados.situacao]}
        </button>
      </header>

      <main>
        {aberta ? (
          <Ficha item={aberta} aoVoltar={() => setClienteId(null)} />
        ) : aba === 'inicio' ? (
          <Inicio lista={lista} abrir={abrir} irPara={setAba} />
        ) : aba === 'clientes' ? (
          <Clientes lista={lista} abrir={abrir} />
        ) : aba === 'cobrancas' ? (
          <Cobrancas lista={lista} abrir={abrir} />
        ) : (
          <Ajustes />
        )}
      </main>

      <nav className="abas">
        {ABAS.map((a) => (
          <button
            key={a.id}
            className={!aberta && aba === a.id ? 'ativa' : ''}
            onClick={() => {
              setClienteId(null)
              setAba(a.id)
              window.scrollTo(0, 0)
            }}
          >
            <span aria-hidden>{a.icone}</span>
            {a.nome}
          </button>
        ))}
      </nav>
    </div>
  )
}
