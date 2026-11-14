// Modelos de mensagem no tom de voz do ateliê. Cada modelo pode ser editado em Ajustes;
// o texto editado fica na aba "config" da planilha com a chave `msg_<id>`.

import { brl, dataBR, primeiroNome, type Cliente, type Posicao } from './dominio'

export interface Modelo {
  id: string
  titulo: string
  tipo: 'individual' | 'turma'
  texto: string
}

export const MODELOS: Modelo[] = [
  {
    id: 'lembrete',
    titulo: 'Lembrete carinhoso',
    tipo: 'individual',
    texto:
      'Oi, {primeiro_nome}, minha alma livre! 🫶\n\n' +
      'Passando para lembrar da sua parcelinha de {valor_parcela}, com vencimento dia {vencimento}. 💚🩵\n\n' +
      '📲 Chave Pix: {pix}\n' +
      'Me manda o comprovante aqui, tá? 🥰',
  },
  {
    id: 'atraso',
    titulo: 'Parcela em aberto',
    tipo: 'individual',
    texto:
      '🌿 Aviso do Financeiro 🌿\n\n' +
      'Olá, {primeiro_nome}!\n\n' +
      'A parcela com vencimento no dia {vencimento} está em aberto, no valor de {atraso}. ' +
      'Pedimos que regularize o quanto antes.\n\n' +
      '📲 Chave Pix: {pix}\n' +
      'Por favor, envie o comprovante por aqui.\n\n' +
      'Obrigada!\n{assinatura}',
  },
  {
    id: 'posicao',
    titulo: 'Posição da ficha',
    tipo: 'individual',
    texto:
      'Olá, {primeiro_nome}, alma livre! 🌿\n\n' +
      'Segue a posição da sua fichinha:\n' +
      '• Saldo em aberto: {saldo}\n' +
      '• Próxima parcela: {valor_parcela} no dia {vencimento}\n\n' +
      '{parcelas}\n\n' +
      '📲 Chave Pix: {pix}\n\n' +
      'Com carinho,\n{assinatura}',
  },
  {
    id: 'organizar',
    titulo: 'Combinar dia e valor fixos',
    tipo: 'individual',
    texto:
      'Olá, alma livre!\n\n' +
      'Para a gente se organizar com o mesmo cuidado que coloca em cada joia, queremos te pedir uma coisinha: ' +
      'vamos combinar um dia fixo no mês e um valor fixo para os seus pagamentos?\n\n' +
      'Hoje o seu saldo em aberto com a gente é de {saldo}. Com isso em mente, é só responder aqui com o dia ' +
      'e o valor mensal que ficam melhores para você.\n\n' +
      'Obrigada por estar com a gente, você faz o nosso brilho ser real!\n\n' +
      'Com carinho,\n{assinatura}',
  },
  {
    id: 'turma_lembrete',
    titulo: 'Turma: lembrete carinhoso',
    tipo: 'turma',
    texto:
      'Boa tarde, minhas Almas livres!\n' +
      'Passando para lembrar minhas almas lindas da parcelinha da turma do dia {dia}! 🫶🥰💚🩵\n\n' +
      '📲 Chave Pix: {pix}',
  },
  {
    id: 'turma_atraso',
    titulo: 'Turma: parcela em aberto',
    tipo: 'turma',
    texto:
      '🌿 Aviso do Financeiro 🌿\n\n' +
      'Olá, meninas!\n\n' +
      'A parcela com vencimento no dia {dia} já está em aberto. Quem ainda não fez o pagamento, ' +
      'pedimos que regularize o quanto antes.\n\n' +
      '📲 Chave Pix: {pix}\n' +
      'Por favor, enviem o comprovante no privado.\n\n' +
      'Obrigada!\n{assinatura}',
  },
]

export const CONFIG_PADRAO: Record<string, string> = {
  pix: '',
  assinatura: 'Financeiro do Ateliê Alma Livre',
}

export function textoDoModelo(modelo: Modelo, config: Record<string, string>): string {
  return config[`msg_${modelo.id}`] || modelo.texto
}

function preencher(texto: string, campos: Record<string, string>): string {
  // sem chave Pix cadastrada, a linha do Pix some em vez de ficar em branco
  if (!campos.pix) texto = texto.split('\n').filter((l) => !l.includes('{pix}')).join('\n')
  return texto.replace(/\{(\w+)\}/g, (tudo, chave) => (chave in campos ? campos[chave] : tudo))
}

export function mensagemIndividual(
  texto: string,
  cliente: Cliente,
  pos: Posicao,
  config: Record<string, string>,
): string {
  const prox = pos.proxima
  const abertas = pos.parcelas.filter((p) => p.restanteCent > 0)
  return preencher(texto, {
    nome: cliente.nome,
    primeiro_nome: primeiroNome(cliente.nome),
    saldo: brl(pos.saldoCent),
    atraso: brl(pos.atrasoCent || (prox?.restanteCent ?? 0)),
    valor_parcela: prox ? brl(prox.restanteCent) : brl(0),
    vencimento: prox ? dataBR(prox.vencimento) : '',
    dia: pos.dia ? String(pos.dia) : '',
    parcelas: abertas.map((p) => `• ${dataBR(p.vencimento, true)}: ${brl(p.restanteCent)}`).join('\n'),
    pix: config.pix || '',
    assinatura: config.assinatura || '',
  })
}

export function mensagemTurma(texto: string, dia: number, config: Record<string, string>): string {
  return preencher(texto, {
    dia: String(dia),
    pix: config.pix || '',
    assinatura: config.assinatura || '',
  })
}
