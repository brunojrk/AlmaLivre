// Dados do app. Tudo fica guardado no aparelho (resposta instantânea) e é
// sincronizado em segundo plano com a planilha do Google, via Apps Script.
// Sem conexão configurada, o app funciona só no aparelho (modo de teste).

import { useSyncExternalStore } from 'react'
import type { Cliente, Parcela, Recebimento } from './dominio'
import { CONFIG_PADRAO } from './mensagens'

export type Tabela = 'clientes' | 'parcelas' | 'recebimentos' | 'config'

export interface Op {
  tabela: Tabela
  op: 'salvar' | 'apagar'
  linha: { id: string } & Record<string, unknown>
}

interface Dados {
  clientes: Cliente[]
  parcelas: Parcela[]
  recebimentos: Recebimento[]
  config: { id: string; valor: string }[]
}

export type Situacao = 'local' | 'ok' | 'enviando' | 'pendente' | 'erro'

interface Estado extends Dados {
  situacao: Situacao
  erro: string
}

interface Conexao {
  url: string
  token: string
}

const K_DADOS = 'almalivre:dados'
const K_FILA = 'almalivre:fila'
const K_CONEXAO = 'almalivre:conexao'

function ler<T>(chave: string, padrao: T): T {
  try {
    const t = localStorage.getItem(chave)
    return t ? (JSON.parse(t) as T) : padrao
  } catch {
    return padrao
  }
}
function gravar(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor))
  } catch {
    /* armazenamento indisponível: segue só em memória */
  }
}

const VAZIO: Dados = { clientes: [], parcelas: [], recebimentos: [], config: [] }

let conexao = ler<Conexao | null>(K_CONEXAO, null)
let fila = ler<Op[]>(K_FILA, [])
let estado: Estado = {
  ...VAZIO,
  ...ler<Partial<Dados>>(K_DADOS, {}),
  situacao: conexao ? (fila.length ? 'pendente' : 'ok') : 'local',
  erro: '',
}

const ouvintes = new Set<() => void>()
function publicar(novo: Partial<Estado>) {
  estado = { ...estado, ...novo }
  const { clientes, parcelas, recebimentos, config } = estado
  gravar(K_DADOS, { clientes, parcelas, recebimentos, config })
  ouvintes.forEach((f) => f())
}

export function useDados(): Estado {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f)
      return () => ouvintes.delete(f)
    },
    () => estado,
  )
}

export function configDe(e: Pick<Estado, 'config'>): Record<string, string> {
  const c: Record<string, string> = { ...CONFIG_PADRAO }
  for (const { id, valor } of e.config) if (valor !== '') c[id] = String(valor)
  return c
}

export const novoId = () =>
  crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`

function aplicarEm(dados: Dados, ops: Op[]): Dados {
  const novo: Dados = { ...dados }
  for (const { tabela, op, linha } of ops) {
    const atual = novo[tabela] as { id: string }[]
    const resto = atual.filter((x) => x.id !== linha.id)
    ;(novo as unknown as Record<string, unknown>)[tabela] = op === 'salvar' ? [...resto, linha] : resto
  }
  return novo
}

/** Aplica as mudanças na hora no aparelho e agenda o envio para a planilha. */
export function aplicar(ops: Op[]) {
  if (!ops.length) return
  publicar(aplicarEm(estado, ops))
  if (conexao) {
    fila = [...fila, ...ops]
    gravar(K_FILA, fila)
    publicar({ situacao: 'pendente' })
    agendar()
  }
}

export function salvarConfig(chave: string, valor: string) {
  aplicar([{ tabela: 'config', op: 'salvar', linha: { id: chave, valor } }])
}

// ---------- sincronização ----------

async function chamar(c: Conexao, corpo: Record<string, unknown>) {
  // text/plain evita a checagem prévia (CORS) que o Apps Script não responde
  const r = await fetch(c.url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...corpo, token: c.token }),
    redirect: 'follow',
  })
  if (!r.ok) throw new Error(`A planilha respondeu com erro ${r.status}`)
  const j = await r.json()
  if (!j.ok) throw new Error(j.erro || 'A planilha recusou o pedido')
  return j
}

const txt = (v: unknown) => (v === null || v === undefined ? '' : String(v))
const num = (v: unknown) => Number(v) || 0

function normalizar(t: Record<string, Record<string, unknown>[]>): Dados {
  return {
    clientes: (t.clientes || []).map((c) => ({
      id: txt(c.id),
      nome: txt(c.nome),
      whatsapp: txt(c.whatsapp),
      obs: txt(c.obs),
      criado_em: txt(c.criado_em),
    })),
    parcelas: (t.parcelas || []).map((p) => ({
      id: txt(p.id),
      cliente_id: txt(p.cliente_id),
      venda_id: txt(p.venda_id),
      descricao: txt(p.descricao),
      vencimento: txt(p.vencimento).slice(0, 10),
      valor: num(p.valor),
    })),
    recebimentos: (t.recebimentos || []).map((r) => ({
      id: txt(r.id),
      cliente_id: txt(r.cliente_id),
      data: txt(r.data).slice(0, 10),
      valor: num(r.valor),
      forma: txt(r.forma),
      obs: txt(r.obs),
    })),
    config: (t.config || []).map((c) => ({ id: txt(c.id), valor: txt(c.valor) })),
  }
}

let rodando = false
let denovo = false
let timer: ReturnType<typeof setTimeout> | undefined

function agendar(ms = 800) {
  clearTimeout(timer)
  timer = setTimeout(() => void sincronizar(), ms)
}

export async function sincronizar(): Promise<void> {
  if (!conexao) return
  if (rodando) {
    denovo = true
    return
  }
  rodando = true
  publicar({ situacao: 'enviando', erro: '' })
  try {
    const enviadas = fila.length
    if (enviadas) {
      await chamar(conexao, { acao: 'gravar', ops: fila.slice(0, enviadas) })
      fila = fila.slice(enviadas)
      gravar(K_FILA, fila)
    }
    const r = await chamar(conexao, { acao: 'ler' })
    // o que foi digitado enquanto a planilha respondia continua valendo
    publicar({ ...aplicarEm(normalizar(r.tabelas), fila), situacao: fila.length ? 'pendente' : 'ok' })
  } catch (e) {
    publicar({ situacao: 'erro', erro: e instanceof Error ? e.message : String(e) })
  } finally {
    rodando = false
    if (denovo || (fila.length && estado.situacao !== 'erro')) {
      denovo = false
      agendar(300)
    }
  }
}

export function conexaoAtual(): Conexao | null {
  return conexao
}

/** O código de conexão tem o formato "URL|SENHA" e vem do menu da planilha. */
export async function conectar(codigo: string): Promise<void> {
  const [url, token] = codigo.trim().split('|').map((s) => s.trim())
  if (!url?.startsWith('https://') || !token) {
    throw new Error('Código inválido. Copie o código completo no menu "Alma Livre" da planilha.')
  }
  const nova = { url, token }
  const r = await chamar(nova, { acao: 'ler' })
  const daPlanilha = normalizar(r.tabelas)
  const planilhaVazia = !daPlanilha.clientes.length && !daPlanilha.parcelas.length
  conexao = nova
  gravar(K_CONEXAO, conexao)
  if (planilhaVazia && (estado.clientes.length || estado.parcelas.length)) {
    // primeira conexão: leva para a planilha o que já estava no aparelho
    const tabelas: Tabela[] = ['clientes', 'parcelas', 'recebimentos', 'config']
    fila = tabelas.flatMap((tabela) =>
      (estado[tabela] as { id: string }[]).map((linha): Op => ({ tabela, op: 'salvar', linha })),
    )
  } else {
    fila = []
    publicar(daPlanilha)
  }
  gravar(K_FILA, fila)
  await sincronizar()
}

export function desconectar() {
  conexao = null
  fila = []
  localStorage.removeItem(K_CONEXAO)
  localStorage.removeItem(K_FILA)
  publicar({ situacao: 'local', erro: '' })
}

export function apagarTudoLocal() {
  publicar({ ...VAZIO })
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void sincronizar())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void sincronizar()
  })
  void sincronizar()
}
