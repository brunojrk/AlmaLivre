import { useMemo, useState } from 'react'
import {
  brl,
  cent,
  combinarParcelas,
  dataBR,
  diaDe,
  gerarParcelas,
  gerarParcelasValorFixo,
  hojeISO,
  lerValor,
  linkWhatsApp,
  proximaDataDoDia,
  reais,
  type NovaParcela,
  type ParcelaPosicao,
  type Recebimento,
} from '../lib/dominio'
import { MODELOS, mensagemIndividual, textoDoModelo } from '../lib/mensagens'
import { aplicar, configDe, novoId, useDados, type Op } from '../lib/store'
import { Campo, CampoValor, Folha, Selo, Vazio } from '../ui'
import { FormCliente } from './Clientes'
import type { ClienteComPosicao } from '../App'

type Painel = null | 'receber' | 'fichinha' | 'combinar' | 'lembrete' | 'editar'

const FORMAS = [
  { id: 'pix', nome: 'Pix' },
  { id: 'dinheiro', nome: 'Dinheiro' },
  { id: 'cartao', nome: 'Cartão' },
]

const centParaTexto = (c: number) => (c / 100).toFixed(2).replace('.', ',')

export function Ficha(props: { item: ClienteComPosicao; aoVoltar: () => void }) {
  const { cliente, pos } = props.item
  const dados = useDados()
  const [painel, setPainel] = useState<Painel>(null)
  const [parcelaEd, setParcelaEd] = useState<ParcelaPosicao | null>(null)
  const [recebEd, setRecebEd] = useState<Recebimento | null>(null)

  const recebimentos = useMemo(
    () =>
      dados.recebimentos
        .filter((r) => r.cliente_id === cliente.id)
        .sort((a, b) => b.data.localeCompare(a.data)),
    [dados.recebimentos, cliente.id],
  )
  const fechar = () => setPainel(null)
  const abertas = pos.parcelas.filter((p) => p.restanteCent > 0)
  const pagas = pos.parcelas.filter((p) => p.restanteCent === 0)

  const apagarCliente = () => {
    if (!confirm(`Apagar ${cliente.nome} e toda a ficha dela? Isso não pode ser desfeito.`)) return
    aplicar([
      ...pos.parcelas.map((p): Op => ({ tabela: 'parcelas', op: 'apagar', linha: { id: p.id } })),
      ...recebimentos.map((r): Op => ({ tabela: 'recebimentos', op: 'apagar', linha: { id: r.id } })),
      { tabela: 'clientes', op: 'apagar', linha: { id: cliente.id } },
    ])
    props.aoVoltar()
  }

  return (
    <>
      <button className="voltar" onClick={props.aoVoltar}>
        ‹ Voltar
      </button>

      <section className="cartao destaque">
        <div className="ficha-nome">
          <h1>{cliente.nome}</h1>
          <button className="link" onClick={() => setPainel('editar')}>
            Editar
          </button>
        </div>
        <span className="rotulo">Saldo em aberto</span>
        <strong className="numero-grande">{brl(pos.saldoCent)}</strong>
        {pos.atrasoCent > 0 && <span className="sub alerta-claro">{brl(pos.atrasoCent)} em atraso</span>}
        {pos.proxima && pos.atrasoCent === 0 && (
          <span className="sub">
            Próxima: {brl(pos.proxima.restanteCent)} em {dataBR(pos.proxima.vencimento, true)}
          </span>
        )}
        {pos.creditoCent > 0 && <span className="sub">Crédito a favor da cliente: {brl(pos.creditoCent)}</span>}
        {cliente.obs && <p className="obs">{cliente.obs}</p>}
      </section>

      <div className="acoes">
        <button className="btn primario" onClick={() => setPainel('receber')}>
          💰 Receber pagamento
        </button>
        <button className="btn" onClick={() => setPainel('lembrete')} disabled={!pos.saldoCent}>
          💬 Lembrete
        </button>
        <button className="btn" onClick={() => setPainel('fichinha')}>
          ＋ Nova fichinha
        </button>
        <button className="btn" onClick={() => setPainel('combinar')} disabled={!pos.saldoCent}>
          🤝 Combinar parcelas
        </button>
      </div>

      <h2 className="titulo-secao">Parcelas em aberto</h2>
      {abertas.length ? (
        <ul className="lista">
          {abertas.map((p) => (
            <li key={p.id}>
              <button className="linha" onClick={() => setParcelaEd(p)}>
                <span className="linha-principal">
                  <b>{dataBR(p.vencimento, true)}</b>
                  <small>
                    {p.status === 'atrasada' && <Selo tipo="alerta">atrasada</Selo>}
                    {p.pagoCent > 0 && ` já pagou ${brl(p.pagoCent)} de ${brl(cent(p.valor))}`}
                    {p.status === 'aberta' && (p.descricao || 'a vencer')}
                  </small>
                </span>
                <span className={`linha-valor ${p.status === 'atrasada' ? 'alerta' : ''}`}>
                  {brl(p.restanteCent)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Vazio>Nenhuma parcela em aberto. 💚</Vazio>
      )}

      <h2 className="titulo-secao">Pagamentos recebidos</h2>
      {recebimentos.length ? (
        <ul className="lista">
          {recebimentos.map((r) => (
            <li key={r.id}>
              <button className="linha" onClick={() => setRecebEd(r)}>
                <span className="linha-principal">
                  <b>{dataBR(r.data, true)}</b>
                  <small>
                    {FORMAS.find((f) => f.id === r.forma)?.nome ?? r.forma}
                    {r.obs && ` · ${r.obs}`}
                  </small>
                </span>
                <span className="linha-valor ok">{brl(cent(r.valor))}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Vazio>Nenhum pagamento registrado ainda.</Vazio>
      )}

      {pagas.length > 0 && (
        <details className="quitadas">
          <summary>Parcelas quitadas ({pagas.length})</summary>
          <ul className="lista">
            {pagas.map((p) => (
              <li key={p.id} className="linha estatica">
                <span className="linha-principal">
                  <b>{dataBR(p.vencimento, true)}</b>
                  <small>{p.descricao || 'paga'}</small>
                </span>
                <span className="linha-valor">{brl(cent(p.valor))}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <button className="link perigo" onClick={apagarCliente}>
        Apagar cliente
      </button>

      {painel === 'receber' && <FormReceber item={props.item} aoFechar={fechar} />}
      {painel === 'fichinha' && <FormFichinha item={props.item} aoFechar={fechar} />}
      {painel === 'combinar' && <FormCombinar item={props.item} aoFechar={fechar} />}
      {painel === 'lembrete' && <FormLembrete item={props.item} aoFechar={fechar} />}
      {painel === 'editar' && <FormCliente cliente={cliente} aoFechar={fechar} aoSalvar={fechar} />}
      {parcelaEd && <FormParcela parcela={parcelaEd} aoFechar={() => setParcelaEd(null)} />}
      {recebEd && (
        <Folha titulo="Pagamento" aoFechar={() => setRecebEd(null)}>
          <p className="resumo">
            {brl(cent(recebEd.valor))} em {dataBR(recebEd.data, true)}
          </p>
          <button
            className="btn perigo largo"
            onClick={() => {
              aplicar([{ tabela: 'recebimentos', op: 'apagar', linha: { id: recebEd.id } }])
              setRecebEd(null)
            }}
          >
            Apagar este pagamento
          </button>
        </Folha>
      )}
    </>
  )
}

function FormReceber({ item, aoFechar }: { item: ClienteComPosicao; aoFechar: () => void }) {
  const { cliente, pos } = item
  const sugestao = pos.atrasoCent || pos.proxima?.restanteCent || 0
  const [valor, setValor] = useState(sugestao ? centParaTexto(sugestao) : '')
  const [data, setData] = useState(hojeISO())
  const [forma, setForma] = useState('pix')
  const [obs, setObs] = useState('')
  const c = lerValor(valor)
  const depois = c ? pos.saldoCent - c : pos.saldoCent

  const salvar = () => {
    if (!c) return
    aplicar([
      {
        tabela: 'recebimentos',
        op: 'salvar',
        linha: { id: novoId(), cliente_id: cliente.id, data, valor: reais(c), forma, obs: obs.trim() },
      },
    ])
    aoFechar()
  }

  return (
    <Folha titulo="Receber pagamento" aoFechar={aoFechar}>
      <Campo rotulo="Quanto ela pagou?">
        <CampoValor valor={valor} aoMudar={setValor} autoFocus />
      </Campo>
      <div className="chips">
        {pos.proxima && (
          <button className="chip" onClick={() => setValor(centParaTexto(pos.proxima!.restanteCent))}>
            Parcela: {brl(pos.proxima.restanteCent)}
          </button>
        )}
        {pos.saldoCent > 0 && (
          <button className="chip" onClick={() => setValor(centParaTexto(pos.saldoCent))}>
            Tudo: {brl(pos.saldoCent)}
          </button>
        )}
      </div>
      <Campo rotulo="Forma">
        <div className="chips">
          {FORMAS.map((f) => (
            <button key={f.id} className={`chip ${forma === f.id ? 'ativo' : ''}`} onClick={() => setForma(f.id)}>
              {f.nome}
            </button>
          ))}
        </div>
      </Campo>
      <Campo rotulo="Data">
        <input type="date" value={data} max={hojeISO()} onChange={(e) => setData(e.target.value)} />
      </Campo>
      <Campo rotulo="Observação (opcional)">
        <input value={obs} onChange={(e) => setObs(e.target.value)} />
      </Campo>
      <p className="resumo">
        {depois >= 0 ? (
          <>
            Saldo depois deste pagamento: <b>{brl(depois)}</b>
          </>
        ) : (
          <>
            Ela está pagando <b>{brl(-depois)}</b> a mais que o saldo. Vai ficar como crédito.
          </>
        )}
      </p>
      <button className="btn primario largo" disabled={!c || !data} onClick={salvar}>
        Confirmar recebimento
      </button>
    </Folha>
  )
}

function Previa({ parcelas }: { parcelas: NovaParcela[] }) {
  if (!parcelas.length) return null
  const iguais = parcelas.every((p) => p.valor === parcelas[0].valor)
  return (
    <div className="previa">
      <b>
        {parcelas.length}x {iguais ? `de ${brl(cent(parcelas[0].valor))}` : ''}
      </b>
      <ul>
        {parcelas.slice(0, 24).map((p, i) => (
          <li key={i}>
            <span>{dataBR(p.vencimento, true)}</span>
            <span>{brl(cent(p.valor))}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function novasParcelasOps(clienteId: string, parcelas: NovaParcela[], descricao: string): Op[] {
  return parcelas.map((p, i) => ({
    tabela: 'parcelas',
    op: 'salvar',
    linha: {
      id: novoId(),
      cliente_id: clienteId,
      venda_id: '',
      descricao: descricao ? `${descricao} (${i + 1}/${parcelas.length})` : `${i + 1}/${parcelas.length}`,
      vencimento: p.vencimento,
      valor: p.valor,
    },
  }))
}

function FormFichinha({ item, aoFechar }: { item: ClienteComPosicao; aoFechar: () => void }) {
  const { cliente, pos } = item
  const diaInicial = pos.dia ?? diaDe(hojeISO())
  const [valor, setValor] = useState('')
  const [n, setN] = useState('3')
  const [dia, setDia] = useState(String(diaInicial))
  const [primeira, setPrimeira] = useState(proximaDataDoDia(diaInicial))
  const [descricao, setDescricao] = useState('')

  const diaN = Math.min(31, Math.max(1, Number(dia) || 1))
  const parcelas = gerarParcelas(lerValor(valor) ?? 0, Math.min(60, Number(n) || 0), primeira, diaN)

  return (
    <Folha titulo="Nova fichinha" aoFechar={aoFechar}>
      <Campo rotulo="Valor total">
        <CampoValor valor={valor} aoMudar={setValor} autoFocus />
      </Campo>
      <div className="lado-a-lado">
        <Campo rotulo="Parcelas">
          <input inputMode="numeric" value={n} onChange={(e) => setN(e.target.value)} />
        </Campo>
        <Campo rotulo="Dia do vencimento">
          <input
            inputMode="numeric"
            value={dia}
            onChange={(e) => {
              setDia(e.target.value)
              const d = Number(e.target.value)
              if (d >= 1 && d <= 31) setPrimeira(proximaDataDoDia(d))
            }}
          />
        </Campo>
      </div>
      <Campo rotulo="Primeira parcela em">
        <input type="date" value={primeira} onChange={(e) => setPrimeira(e.target.value)} />
      </Campo>
      <Campo rotulo="O que ela levou (opcional)">
        <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: brinco e colar" />
      </Campo>
      <Previa parcelas={parcelas} />
      <button
        className="btn primario largo"
        disabled={!parcelas.length || !primeira}
        onClick={() => {
          aplicar(novasParcelasOps(cliente.id, parcelas, descricao.trim()))
          aoFechar()
        }}
      >
        Abrir fichinha
      </button>
    </Folha>
  )
}

/** Troca o que está em aberto por parcelas de valor fixo, num dia fixo. */
function FormCombinar({ item, aoFechar }: { item: ClienteComPosicao; aoFechar: () => void }) {
  const { cliente, pos } = item
  const diaInicial = pos.dia ?? diaDe(hojeISO())
  const [mensal, setMensal] = useState('')
  const [dia, setDia] = useState(String(diaInicial))
  const [primeira, setPrimeira] = useState(proximaDataDoDia(diaInicial))

  const diaN = Math.min(31, Math.max(1, Number(dia) || 1))
  const parcelas = gerarParcelasValorFixo(pos.saldoCent, lerValor(mensal) ?? 0, primeira, diaN)

  const salvar = () => {
    // o que já foi pago fica registrado; só a parte em aberto é reorganizada
    const { apagar, ajustar } = combinarParcelas(pos, primeira)
    const ajustes: Op[] = [
      ...apagar.map((id): Op => ({ tabela: 'parcelas', op: 'apagar', linha: { id } })),
      ...ajustar.map((p): Op => ({ tabela: 'parcelas', op: 'salvar', linha: { ...p } })),
    ]
    aplicar([...ajustes, ...novasParcelasOps(cliente.id, parcelas, 'Combinado')])
    aoFechar()
  }

  return (
    <Folha titulo="Combinar parcelas" aoFechar={aoFechar}>
      <p className="resumo">
        Saldo em aberto: <b>{brl(pos.saldoCent)}</b>. As parcelas em aberto serão trocadas pelo novo combinado.
      </p>
      <Campo rotulo="Valor fixo por mês">
        <CampoValor valor={mensal} aoMudar={setMensal} autoFocus />
      </Campo>
      <div className="lado-a-lado">
        <Campo rotulo="Dia do vencimento">
          <input
            inputMode="numeric"
            value={dia}
            onChange={(e) => {
              setDia(e.target.value)
              const d = Number(e.target.value)
              if (d >= 1 && d <= 31) setPrimeira(proximaDataDoDia(d))
            }}
          />
        </Campo>
        <Campo rotulo="Primeira parcela em">
          <input type="date" value={primeira} onChange={(e) => setPrimeira(e.target.value)} />
        </Campo>
      </div>
      <Previa parcelas={parcelas} />
      <button className="btn primario largo" disabled={!parcelas.length || !primeira} onClick={salvar}>
        Salvar combinado
      </button>
    </Folha>
  )
}

function FormParcela({ parcela, aoFechar }: { parcela: ParcelaPosicao; aoFechar: () => void }) {
  const [valor, setValor] = useState(centParaTexto(cent(parcela.valor)))
  const [vencimento, setVencimento] = useState(parcela.vencimento)
  const c = lerValor(valor)

  return (
    <Folha titulo="Editar parcela" aoFechar={aoFechar}>
      <Campo rotulo="Valor da parcela">
        <CampoValor valor={valor} aoMudar={setValor} />
      </Campo>
      <Campo rotulo="Vencimento">
        <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
      </Campo>
      <button
        className="btn primario largo"
        disabled={!c || !vencimento}
        onClick={() => {
          aplicar([
            {
              tabela: 'parcelas',
              op: 'salvar',
              linha: {
                id: parcela.id,
                cliente_id: parcela.cliente_id,
                venda_id: parcela.venda_id,
                descricao: parcela.descricao,
                vencimento,
                valor: reais(c!),
              },
            },
          ])
          aoFechar()
        }}
      >
        Salvar
      </button>
      <button
        className="btn perigo largo"
        onClick={() => {
          if (!confirm('Apagar esta parcela?')) return
          aplicar([{ tabela: 'parcelas', op: 'apagar', linha: { id: parcela.id } }])
          aoFechar()
        }}
      >
        Apagar parcela
      </button>
    </Folha>
  )
}

function FormLembrete({ item, aoFechar }: { item: ClienteComPosicao; aoFechar: () => void }) {
  const { cliente, pos } = item
  const config = configDe(useDados())
  const modelos = MODELOS.filter((m) => m.tipo === 'individual')
  const inicial = pos.atrasoCent > 0 ? 'atraso' : 'lembrete'
  const montar = (id: string) =>
    mensagemIndividual(textoDoModelo(modelos.find((m) => m.id === id)!, config), cliente, pos, config)
  const [modelo, setModelo] = useState(inicial)
  const [texto, setTexto] = useState(() => montar(inicial))
  const [copiado, setCopiado] = useState(false)

  return (
    <Folha titulo={`Mensagem para ${cliente.nome.split(' ')[0]}`} aoFechar={aoFechar}>
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
            {m.titulo}
          </button>
        ))}
      </div>
      <textarea className="mensagem" rows={11} value={texto} onChange={(e) => setTexto(e.target.value)} />
      {!config.pix && <p className="dica">Cadastre a chave Pix em Ajustes para ela aparecer na mensagem.</p>}
      <a className="btn primario largo" href={linkWhatsApp(cliente.whatsapp, texto)} target="_blank" rel="noreferrer">
        Abrir no WhatsApp
      </a>
      {!cliente.whatsapp && (
        <p className="dica">Sem número cadastrado: o WhatsApp vai pedir para você escolher a conversa.</p>
      )}
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
