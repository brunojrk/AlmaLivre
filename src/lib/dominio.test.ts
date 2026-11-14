import { describe, expect, it } from 'vitest'
import {
  calcularPosicao,
  combinarParcelas,
  gerarParcelas,
  gerarParcelasValorFixo,
  lerValor,
  linkWhatsApp,
  proximaDataDoDia,
  somarMeses,
  type Parcela,
  type Recebimento,
} from './dominio'
import { MODELOS, mensagemIndividual, mensagemTurma } from './mensagens'

const parcela = (id: string, vencimento: string, valor: number): Parcela => ({
  id,
  cliente_id: 'c',
  venda_id: '',
  descricao: '',
  vencimento,
  valor,
})
const receb = (valor: number, data = '2026-11-01'): Recebimento => ({
  id: `r${valor}${data}`,
  cliente_id: 'c',
  data,
  valor,
  forma: 'pix',
  obs: '',
})

describe('datas', () => {
  it('mantém o dia combinado e respeita meses curtos', () => {
    expect(somarMeses('2027-01-31', 1, 31)).toBe('2027-02-28')
    expect(somarMeses('2027-01-31', 2, 31)).toBe('2027-03-31')
    expect(somarMeses('2026-11-20', 2)).toBe('2027-01-20')
    expect(somarMeses('2026-12-10', -1, 10)).toBe('2026-11-10')
  })
  it('acha a próxima data do dia combinado', () => {
    expect(proximaDataDoDia(20, '2026-11-14')).toBe('2026-11-20')
    expect(proximaDataDoDia(14, '2026-11-14')).toBe('2026-11-14')
    expect(proximaDataDoDia(5, '2026-12-14')).toBe('2027-01-05')
  })
})

describe('parcelas', () => {
  it('divide igualmente e joga os centavos na última', () => {
    const p = gerarParcelas(10000, 3, '2026-12-10', 10)
    expect(p.map((x) => x.valor)).toEqual([33.33, 33.33, 33.34])
    expect(p.map((x) => x.vencimento)).toEqual(['2026-12-10', '2027-01-10', '2027-02-10'])
  })
  it('valor fixo mensal: a última parcela é o que sobra', () => {
    const p = gerarParcelasValorFixo(142300, 30000, '2026-12-20', 20)
    expect(p.map((x) => x.valor)).toEqual([300, 300, 300, 300, 223])
  })
})

describe('posição da cliente', () => {
  const parcelas = [
    parcela('a', '2026-10-20', 100),
    parcela('b', '2026-11-20', 100),
    parcela('c', '2026-12-20', 100),
  ]

  it('sem pagamentos: o que venceu está em atraso', () => {
    const pos = calcularPosicao(parcelas, [], '2026-11-14')
    expect(pos.saldoCent).toBe(30000)
    expect(pos.atrasoCent).toBe(10000)
    expect(pos.proxima?.id).toBe('a')
    expect(pos.dia).toBe(20)
  })

  it('pagamento variável abate as parcelas mais antigas primeiro', () => {
    const pos = calcularPosicao(parcelas, [receb(70), receb(80)], '2026-11-14')
    expect(pos.parcelas.map((p) => p.status)).toEqual(['paga', 'parcial', 'aberta'])
    expect(pos.parcelas[1].restanteCent).toBe(5000)
    expect(pos.saldoCent).toBe(15000)
    expect(pos.atrasoCent).toBe(0)
  })

  it('pagar a mais vira crédito', () => {
    const pos = calcularPosicao(parcelas, [receb(350)], '2026-11-14')
    expect(pos.saldoCent).toBe(0)
    expect(pos.creditoCent).toBe(5000)
    expect(pos.proxima).toBeNull()
    expect(pos.dia).toBeNull()
  })
})

describe('combinar parcelas', () => {
  it('mantém o saldo e deixa em aberto só o novo combinado', () => {
    const antigas = [
      parcela('a', '2026-11-20', 150),
      parcela('b', '2026-12-20', 150),
      parcela('c', '2027-01-20', 150),
    ]
    const pagos = [receb(200)]
    const antes = calcularPosicao(antigas, pagos, '2026-11-14')
    expect(antes.saldoCent).toBe(25000)

    const { apagar, ajustar } = combinarParcelas(antes, '2026-11-20')
    expect(apagar).toEqual(['c'])
    const novas = gerarParcelasValorFixo(antes.saldoCent, 10000, '2026-11-20', 20).map((n, i) =>
      parcela(`n${i}`, n.vencimento, n.valor),
    )
    const depois = calcularPosicao([...ajustar, ...novas], pagos, '2026-11-14')
    expect(depois.saldoCent).toBe(25000)
    const abertas = depois.parcelas.filter((p) => p.restanteCent > 0)
    expect(abertas.map((p) => [p.id, p.restanteCent, p.pagoCent])).toEqual([
      ['n0', 10000, 0],
      ['n1', 10000, 0],
      ['n2', 5000, 0],
    ])
  })
})

describe('entrada de valores', () => {
  it('entende os formatos que ela pode digitar', () => {
    expect(lerValor('1.423,50')).toBe(142350)
    expect(lerValor('80')).toBe(8000)
    expect(lerValor('R$ 12,5')).toBe(1250)
    expect(lerValor('')).toBeNull()
  })
})

describe('mensagens', () => {
  const cliente = { id: 'c', nome: 'Maria Silva', whatsapp: '11987654321', obs: '', criado_em: '' }
  const config = { pix: 'chave-teste', assinatura: 'Financeiro do Ateliê Alma Livre' }
  const pos = calcularPosicao([parcela('a', '2026-11-20', 150), parcela('b', '2026-12-20', 150)], [], '2026-11-14')

  it('preenche todos os campos do lembrete individual', () => {
    for (const m of MODELOS.filter((x) => x.tipo === 'individual')) {
      const t = mensagemIndividual(m.texto, cliente, pos, config)
      expect(t, m.id).not.toMatch(/\{\w+\}/)
    }
    const t = mensagemIndividual(MODELOS[0].texto, cliente, pos, config)
    expect(t).toContain('Maria')
    expect(t).toContain('R$ 150,00')
    expect(t).toContain('20/11')
    expect(t).toContain('chave-teste')
  })

  it('preenche a mensagem da turma', () => {
    const t = mensagemTurma(MODELOS.find((m) => m.id === 'turma_lembrete')!.texto, 20, config)
    expect(t).toContain('turma do dia 20')
    expect(t).not.toMatch(/\{\w+\}/)
  })

  it('monta o link do WhatsApp com o código do Brasil', () => {
    expect(linkWhatsApp('(11) 98765-4321', 'oi')).toBe('https://wa.me/5511987654321?text=oi')
    expect(linkWhatsApp('', 'oi')).toBe('https://wa.me/?text=oi')
  })
})
