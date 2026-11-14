# Alma Livre — app de gestão do ateliê

App (PWA) para a Raissa controlar o Ateliê Alma Livre (joias de prata) pelo iPhone.
Ela é a única usuária e é leiga em tecnologia: telas simples, botões grandes, poucos
passos, tudo em português do Brasil. O Bruno (marido) cuida da parte técnica.

## Regras do negócio

- **Fichinha**: caderneta da cliente. Sem juros e sem multa. As clientes pagam valores
  variáveis; por isso um pagamento nunca é amarrado a uma parcela: tudo o que a cliente
  pagou abate as parcelas mais antigas primeiro (`calcularPosicao` em `src/lib/dominio.ts`).
- **Turma**: clientes agrupadas pelo dia do mês em que pagam ("turma do dia 20").
  As cobranças em grupo são feitas por turma.
- **Preço**: sugerido = 3x o custo, sempre editável (fase 2).
- **Venda**: desconto no carrinho (R$ ou %) e um segundo desconto na forma de pagamento,
  normalmente maior no Pix (fase 2).
- **Cartão**: InfinitePay, taxa geral de 5% por enquanto, configurável (fase 3).
- **Tom das mensagens**: dois registros, os dois dela — carinhoso ("alma livre",
  "parcelinha", emojis 🫶🥰💚🩵🌿) e formal ("Financeiro do Ateliê Alma Livre").
  Os modelos ficam em `src/lib/mensagens.ts` e podem ser editados no app.

## Arquitetura

- Frontend: React + Vite + TypeScript, sem biblioteca de UI. CSS em `src/estilo.css`.
- Dados: planilha do Google na conta do Bruno, acessada por um Apps Script publicado
  como App da Web (`apps-script/Code.gs`). Uma aba por tabela; a primeira coluna é `id`.
- `src/lib/store.ts`: guarda tudo no aparelho (localStorage), aplica mudanças na hora e
  sincroniza em segundo plano (fila de operações `salvar`/`apagar`). Sem conexão
  configurada o app roda só no aparelho.
- Dinheiro: reais na planilha, centavos inteiros nas contas. Datas: texto `AAAA-MM-DD`.
- Nomes de código em português, como o resto do projeto.

## Cuidados

- Nada de dados reais no repositório: chave Pix, senha de conexão, nomes de clientes e
  extratos bancários ficam só na planilha ou fora daqui.
- Mudou colunas de uma tabela? Atualize `TABELAS` em `apps-script/Code.gs`, `normalizar`
  em `store.ts` e avise que o script precisa ser republicado na planilha.
- Antes de entregar: `npm test` e `npm run build`.

## Fases

1. Fichinhas: clientes, parcelas, pagamentos, cobranças, lembretes (feita).
2. Estoque com fotos, vitrine e venda.
3. Recebimentos (cartão, taxas) e relatórios.
4. Ajustes após o uso real.
