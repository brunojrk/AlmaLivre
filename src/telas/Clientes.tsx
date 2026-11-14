import { useState } from 'react'
import { brl, dataBR, hojeISO, soDigitos, type Cliente } from '../lib/dominio'
import { aplicar, novoId } from '../lib/store'
import { Campo, Folha, Selo, Vazio } from '../ui'
import type { ClienteComPosicao } from '../App'

const semAcento = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

export function Clientes(props: { lista: ClienteComPosicao[]; abrir: (id: string) => void }) {
  const [busca, setBusca] = useState('')
  const [nova, setNova] = useState(false)
  const filtradas = props.lista.filter((x) => semAcento(x.cliente.nome).includes(semAcento(busca)))

  return (
    <>
      <div className="barra-acoes">
        <input
          className="busca"
          type="search"
          placeholder="Buscar cliente"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <button className="btn primario" onClick={() => setNova(true)}>
          + Nova
        </button>
      </div>

      {filtradas.length ? (
        <ul className="lista">
          {filtradas.map(({ cliente, pos }) => (
            <li key={cliente.id}>
              <button className="linha" onClick={() => props.abrir(cliente.id)}>
                <span className="linha-principal">
                  <b>{cliente.nome}</b>
                  <small>
                    {pos.saldoCent === 0 ? (
                      <Selo tipo="neutro">sem saldo</Selo>
                    ) : pos.atrasoCent > 0 ? (
                      <Selo tipo="alerta">em atraso</Selo>
                    ) : (
                      <>próxima {dataBR(pos.proxima!.vencimento)}</>
                    )}
                  </small>
                </span>
                <span className="linha-valor">{pos.saldoCent ? brl(pos.saldoCent) : '—'}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Vazio>{props.lista.length ? 'Nenhuma cliente com esse nome.' : 'Nenhuma cliente cadastrada ainda.'}</Vazio>
      )}

      {nova && (
        <FormCliente
          aoFechar={() => setNova(false)}
          aoSalvar={(id) => {
            setNova(false)
            props.abrir(id)
          }}
        />
      )}
    </>
  )
}

export function FormCliente(props: {
  cliente?: Cliente
  aoFechar: () => void
  aoSalvar: (id: string) => void
}) {
  const c = props.cliente
  const [nome, setNome] = useState(c?.nome ?? '')
  const [whatsapp, setWhatsapp] = useState(c?.whatsapp ?? '')
  const [obs, setObs] = useState(c?.obs ?? '')

  const salvar = () => {
    const id = c?.id ?? novoId()
    aplicar([
      {
        tabela: 'clientes',
        op: 'salvar',
        linha: {
          id,
          nome: nome.trim(),
          whatsapp: soDigitos(whatsapp),
          obs: obs.trim(),
          criado_em: c?.criado_em || hojeISO(),
        },
      },
    ])
    props.aoSalvar(id)
  }

  return (
    <Folha titulo={c ? 'Editar cliente' : 'Nova cliente'} aoFechar={props.aoFechar}>
      <Campo rotulo="Nome">
        <input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus={!c} autoCapitalize="words" />
      </Campo>
      <Campo rotulo="WhatsApp com DDD" dica="Só números. Ex.: 11987654321">
        <input inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
      </Campo>
      <Campo rotulo="Observações">
        <textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
      </Campo>
      <button className="btn primario largo" disabled={!nome.trim()} onClick={salvar}>
        Salvar
      </button>
    </Folha>
  )
}
