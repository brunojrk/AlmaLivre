import { useState } from 'react'
import { MODELOS, textoDoModelo, type Modelo } from '../lib/mensagens'
import { conectar, conexaoAtual, configDe, desconectar, salvarConfig, sincronizar, useDados } from '../lib/store'
import { Campo, Folha } from '../ui'

export function Ajustes() {
  const dados = useDados()
  const config = configDe(dados)
  const [modeloEd, setModeloEd] = useState<Modelo | null>(null)
  const [codigo, setCodigo] = useState('')
  const [conectando, setConectando] = useState(false)
  const [erro, setErro] = useState('')
  const conectado = !!conexaoAtual()

  const ligar = async () => {
    setConectando(true)
    setErro('')
    try {
      await conectar(codigo)
      setCodigo('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setConectando(false)
    }
  }

  return (
    <>
      <h2 className="titulo-secao">Mensagens</h2>
      <section className="cartao">
        <CampoConfig chave="pix" rotulo="Chave Pix" valor={config.pix} />
        <CampoConfig chave="assinatura" rotulo="Assinatura das mensagens" valor={config.assinatura} />
      </section>

      <h2 className="titulo-secao">Modelos de mensagem</h2>
      <ul className="lista">
        {MODELOS.map((m) => (
          <li key={m.id}>
            <button className="linha" onClick={() => setModeloEd(m)}>
              <span className="linha-principal">
                <b>{m.titulo}</b>
                <small>{config[`msg_${m.id}`] ? 'personalizado' : 'padrão'}</small>
              </span>
              <span className="linha-valor">›</span>
            </button>
          </li>
        ))}
      </ul>

      <h2 className="titulo-secao">Planilha do Google</h2>
      <section className="cartao">
        {conectado ? (
          <>
            <p className="resumo">
              {dados.situacao === 'erro'
                ? `Não consegui falar com a planilha: ${dados.erro}`
                : 'Conectado. Tudo o que você lança aqui é salvo na planilha.'}
            </p>
            <button className="btn largo" onClick={() => void sincronizar()}>
              Atualizar agora
            </button>
            <button
              className="link perigo"
              onClick={() => {
                if (confirm('Desconectar da planilha? Os dados continuam neste aparelho e na planilha.')) desconectar()
              }}
            >
              Desconectar
            </button>
          </>
        ) : (
          <>
            <p className="resumo">
              Sem conexão com a planilha: os dados estão <b>só neste aparelho</b>. Cole abaixo o código de conexão.
            </p>
            <Campo rotulo="Código de conexão" dica='Na planilha: menu "Alma Livre" › "Código de conexão".'>
              <textarea rows={3} value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            </Campo>
            {erro && <p className="erro">{erro}</p>}
            <button className="btn primario largo" disabled={!codigo.trim() || conectando} onClick={() => void ligar()}>
              {conectando ? 'Conectando…' : 'Conectar'}
            </button>
          </>
        )}
      </section>

      <p className="versao">Alma Livre · versão 0.1 (fichinhas)</p>

      {modeloEd && <EditorModelo modelo={modeloEd} atual={textoDoModelo(modeloEd, config)} aoFechar={() => setModeloEd(null)} />}
    </>
  )
}

function CampoConfig(props: { chave: string; rotulo: string; valor: string }) {
  const [v, setV] = useState(props.valor)
  return (
    <Campo rotulo={props.rotulo}>
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v.trim() !== props.valor && salvarConfig(props.chave, v.trim())}
      />
    </Campo>
  )
}

function EditorModelo(props: { modelo: Modelo; atual: string; aoFechar: () => void }) {
  const [texto, setTexto] = useState(props.atual)
  const chave = `msg_${props.modelo.id}`
  const campos =
    props.modelo.tipo === 'turma'
      ? '{dia} {pix} {assinatura}'
      : '{primeiro_nome} {nome} {saldo} {valor_parcela} {vencimento} {atraso} {parcelas} {pix} {assinatura}'
  return (
    <Folha titulo={props.modelo.titulo} aoFechar={props.aoFechar}>
      <textarea className="mensagem" rows={12} value={texto} onChange={(e) => setTexto(e.target.value)} />
      <p className="dica">O app troca sozinho estes campos: {campos}</p>
      <button
        className="btn primario largo"
        onClick={() => {
          salvarConfig(chave, texto === props.modelo.texto ? '' : texto)
          props.aoFechar()
        }}
      >
        Salvar
      </button>
      <button
        className="btn largo"
        onClick={() => {
          salvarConfig(chave, '')
          props.aoFechar()
        }}
      >
        Voltar ao texto padrão
      </button>
    </Folha>
  )
}
