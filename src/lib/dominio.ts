// Regras de negócio das fichinhas. Tudo aqui é função pura (sem tela, sem rede),
// para poder ser testado. Valores em reais nos dados; contas feitas em centavos.

export interface Cliente {
  id: string
  nome: string
  whatsapp: string
  obs: string
  criado_em: string
}

export interface Parcela {
  id: string
  cliente_id: string
  venda_id: string
  descricao: string
  vencimento: string // AAAA-MM-DD
  valor: number // reais
}

export interface Recebimento {
  id: string
  cliente_id: string
  data: string // AAAA-MM-DD
  valor: number // reais
  forma: string // pix | dinheiro | cartao
  obs: string
}

export type StatusParcela = 'paga' | 'parcial' | 'aberta' | 'atrasada'

export interface ParcelaPosicao extends Parcela {
  pagoCent: number
  restanteCent: number
  status: StatusParcela
}

export interface Posicao {
  parcelas: ParcelaPosicao[]
  saldoCent: number
  atrasoCent: number
  creditoCent: number
  proxima: ParcelaPosicao | null
  /** dia do mês em que a cliente costuma pagar (a "turma") */
  dia: number | null
}

export const cent = (reais: number) => Math.round((Number(reais) || 0) * 100)
export const reais = (c: number) => c / 100

// ---------- datas (sempre texto AAAA-MM-DD, sem fuso) ----------

const p2 = (n: number) => String(n).padStart(2, '0')

export function hojeISO(d = new Date()): string {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}

export function diasNoMes(ano: number, mes1a12: number): number {
  return new Date(ano, mes1a12, 0).getDate()
}

/** Data no mês/ano dados com o dia pedido; se o mês não tem esse dia, usa o último. */
export function dataComDia(ano: number, mes1a12: number, dia: number): string {
  const d = Math.min(dia, diasNoMes(ano, mes1a12))
  return `${ano}-${p2(mes1a12)}-${p2(d)}`
}

/** Soma meses mantendo o dia combinado (ex.: dia 31 vira 28/29/30 quando preciso). */
export function somarMeses(iso: string, meses: number, dia?: number): string {
  const [a, m, d] = iso.split('-').map(Number)
  const total = a * 12 + (m - 1) + meses
  return dataComDia(Math.floor(total / 12), (total % 12) + 1, dia ?? d)
}

/** Próxima data (hoje ou depois) que cai no dia combinado. */
export function proximaDataDoDia(dia: number, hoje = hojeISO()): string {
  const [a, m] = hoje.split('-').map(Number)
  const esteMes = dataComDia(a, m, dia)
  return esteMes >= hoje ? esteMes : somarMeses(esteMes, 1, dia)
}

export function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split('-').map(Number)
  return hojeISO(new Date(a, m - 1, d + dias))
}

export const diaDe = (iso: string) => Number(iso.split('-')[2])

// ---------- posição da cliente ----------

/**
 * Os pagamentos não são amarrados a uma parcela: tudo o que a cliente pagou
 * abate as parcelas mais antigas primeiro. Assim, pagar a mais, a menos ou
 * fora de data nunca bagunça a ficha.
 */
export function calcularPosicao(
  parcelas: Parcela[],
  recebimentos: Recebimento[],
  hoje = hojeISO(),
): Posicao {
  const ordenadas = [...parcelas].sort(
    (a, b) => a.vencimento.localeCompare(b.vencimento) || a.id.localeCompare(b.id),
  )
  let disponivel = recebimentos.reduce((s, r) => s + cent(r.valor), 0)
  let saldoCent = 0
  let atrasoCent = 0
  let proxima: ParcelaPosicao | null = null

  const lista = ordenadas.map((p): ParcelaPosicao => {
    const valorCent = cent(p.valor)
    const pagoCent = Math.min(valorCent, disponivel)
    disponivel -= pagoCent
    const restanteCent = valorCent - pagoCent
    let status: StatusParcela
    if (restanteCent === 0) status = 'paga'
    else if (p.vencimento < hoje) status = 'atrasada'
    else status = pagoCent > 0 ? 'parcial' : 'aberta'
    saldoCent += restanteCent
    if (status === 'atrasada') atrasoCent += restanteCent
    const pos = { ...p, pagoCent, restanteCent, status }
    if (!proxima && restanteCent > 0) proxima = pos
    return pos
  })

  // a "turma" é o dia da última parcela em aberto (o combinado mais recente)
  const abertas = lista.filter((p) => p.restanteCent > 0)
  const dia = abertas.length ? diaDe(abertas[abertas.length - 1].vencimento) : null

  return { parcelas: lista, saldoCent, atrasoCent, creditoCent: disponivel, proxima, dia }
}

// ---------- criação de parcelas ----------

export interface NovaParcela {
  vencimento: string
  valor: number
}

/** Divide o total em N parcelas mensais iguais; os centavos que sobram vão para a última. */
export function gerarParcelas(totalCent: number, n: number, primeira: string, dia: number): NovaParcela[] {
  if (totalCent <= 0 || n < 1) return []
  const base = Math.floor(totalCent / n)
  return Array.from({ length: n }, (_, i) => ({
    vencimento: somarMeses(primeira, i, dia),
    valor: reais(i === n - 1 ? totalCent - base * (n - 1) : base),
  }))
}

/** Parcelas de valor fixo mensal até quitar o total; a última fica com o que sobrar. */
export function gerarParcelasValorFixo(
  totalCent: number,
  mensalCent: number,
  primeira: string,
  dia: number,
): NovaParcela[] {
  if (totalCent <= 0 || mensalCent <= 0) return []
  const lista: NovaParcela[] = []
  let falta = totalCent
  for (let i = 0; falta > 0 && i < 120; i++) {
    const v = Math.min(mensalCent, falta)
    lista.push({ vencimento: somarMeses(primeira, i, dia), valor: reais(v) })
    falta -= v
  }
  return lista
}

/**
 * "Combinar parcelas": troca tudo o que está em aberto por um novo combinado.
 * O que já foi pago continua registrado (a parcela parcial encolhe para o valor
 * pago). Como os pagamentos abatem as parcelas por ordem de data, as parcelas
 * já pagas precisam ficar antes do novo combinado — por isso a data delas é
 * puxada para a véspera da primeira parcela nova quando necessário.
 */
export function combinarParcelas(
  pos: Posicao,
  primeiraNova: string,
): { apagar: string[]; ajustar: Parcela[] } {
  const vespera = somarDias(primeiraNova, -1)
  const apagar: string[] = []
  const ajustar: Parcela[] = []
  for (const p of pos.parcelas) {
    if (p.pagoCent === 0) {
      apagar.push(p.id)
      continue
    }
    const vencimento = p.vencimento >= primeiraNova ? vespera : p.vencimento
    if (p.restanteCent > 0 || vencimento !== p.vencimento) {
      const { pagoCent, restanteCent: _r, status: _s, ...base } = p
      ajustar.push({ ...base, vencimento, valor: reais(pagoCent) })
    }
  }
  return { apagar, ajustar }
}

// ---------- formatação ----------

const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const brl = (c: number) => fmtBRL.format(c / 100).replace(/ /g, ' ')

export function dataBR(iso: string, comAno = false): string {
  if (!iso) return ''
  const [a, m, d] = iso.split('-')
  return comAno ? `${d}/${m}/${a}` : `${d}/${m}`
}

/** Aceita "1.423,50", "1423.5", "R$ 80" e devolve centavos (ou null se inválido). */
export function lerValor(texto: string): number | null {
  let t = texto.replace(/[^\d.,]/g, '')
  if (!t) return null
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  const n = Number(t)
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

export const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] || ''

export const soDigitos = (t: string) => String(t ?? '').replace(/\D/g, '')

export function linkWhatsApp(numero: string, texto: string): string {
  let n = soDigitos(numero)
  if (n && n.length <= 11) n = '55' + n
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`
}
