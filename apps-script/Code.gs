/**
 * Alma Livre — ponte entre o app e esta planilha.
 *
 * Como instalar (uma vez só): veja o passo a passo em apps-script/INSTALAR.md.
 * Resumo: cole este arquivo em Extensões > Apps Script, rode "configurar",
 * publique como App da Web e copie o código de conexão para o app.
 *
 * O app envia pedidos POST com uma senha (token). Sem a senha certa, nada é
 * lido nem gravado.
 */

var TABELAS = {
  clientes: ['id', 'nome', 'whatsapp', 'obs', 'criado_em'],
  parcelas: ['id', 'cliente_id', 'venda_id', 'descricao', 'vencimento', 'valor'],
  recebimentos: ['id', 'cliente_id', 'data', 'valor', 'forma', 'obs'],
  config: ['id', 'valor']
};

var ABA_IMPORTAR = 'Importar';
var COLUNAS_IMPORTAR = [
  'Nome da cliente *', 'WhatsApp com DDD', 'Saldo em aberto (R$) *', 'Parcelas restantes *',
  'Valor da parcela (R$)', 'Dia do vencimento (1 a 31) *', 'Próximo vencimento *',
  'Valor em atraso (R$)', 'Observações', 'Importado em'
];

// ---------- menu e instalação ----------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Alma Livre')
    .addItem('Código de conexão', 'mostrarCodigo')
    .addItem('Trocar o endereço do App da Web', 'trocarEndereco')
    .addItem('Importar fichinhas da aba "Importar"', 'importarFichinhas')
    .addSeparator()
    .addItem('Configurar planilha (primeira vez)', 'configurar')
    .addToUi();
}

/** Cria as abas e a senha de acesso. Pode ser rodado de novo sem apagar nada. */
function configurar() {
  var ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone('America/Sao_Paulo');
  Object.keys(TABELAS).forEach(function (nome) { garantirAba_(ss, nome, TABELAS[nome]); });
  garantirAba_(ss, ABA_IMPORTAR, COLUNAS_IMPORTAR);
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('TOKEN')) {
    props.setProperty('TOKEN', Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''));
  }
  var padrao = ss.getSheetByName('Página1') || ss.getSheetByName('Sheet1');
  if (padrao && padrao.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(padrao);
  SpreadsheetApp.getUi().alert('Planilha configurada. Agora publique como App da Web (veja INSTALAR.md).');
}

function garantirAba_(ss, nome, colunas) {
  var aba = ss.getSheetByName(nome) || ss.insertSheet(nome);
  var atuais = aba.getLastColumn()
    ? aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(String)
    : [];
  colunas.forEach(function (c) {
    if (atuais.indexOf(c) === -1) {
      atuais.push(c);
      aba.getRange(1, atuais.length).setValue(c);
    }
  });
  aba.getRange(1, 1, 1, atuais.length).setFontWeight('bold').setBackground('#4f7a68').setFontColor('#ffffff');
  aba.setFrozenRows(1);
  return aba;
}

function mostrarCodigo() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('TOKEN');
  var ui = SpreadsheetApp.getUi();
  if (!token) return ui.alert('Rode primeiro "Configurar planilha (primeira vez)".');
  var url = props.getProperty('URL');
  if (!url) return trocarEndereco();
  var html = HtmlService.createHtmlOutput(
    '<p style="font-family:sans-serif">Copie tudo e cole no app, em Ajustes › Código de conexão:</p>' +
    '<textarea style="width:100%;height:120px" readonly onclick="this.select()">' + url + '|' + token + '</textarea>' +
    '<p style="font-family:sans-serif;color:#a33">Quem tiver este código acessa os dados. Não compartilhe.</p>'
  ).setWidth(480).setHeight(260);
  ui.showModalDialog(html, 'Código de conexão');
}

/**
 * O endereço do App da Web só aparece na janela de implantação, então é
 * informado aqui uma vez. (ScriptApp.getService().getUrl() devolve o endereço
 * de teste, que não serve para o app.)
 */
function trocarEndereco() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt(
    'Endereço do App da Web',
    'Cole o "URL do app da Web" que aparece em Implantar > Gerenciar implantações (termina em /exec):',
    ui.ButtonSet.OK_CANCEL
  );
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var url = r.getResponseText().trim();
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)) {
    return ui.alert('Esse não parece o endereço certo. Ele começa com https://script.google.com/macros/s/ e termina em /exec.');
  }
  PropertiesService.getScriptProperties().setProperty('URL', url);
  mostrarCodigo();
}

// ---------- API usada pelo app ----------

/**
 * Abrir o endereço no navegador mostra um diagnóstico sem nenhum dado nem
 * segredo: só se este script está ligado a uma planilha e se já tem senha.
 */
function doGet() {
  return json_({
    ok: true,
    app: 'alma-livre',
    versao: 2,
    ligado_a_planilha: !!SpreadsheetApp.getActive(),
    senha_configurada: !!PropertiesService.getScriptProperties().getProperty('TOKEN')
  });
}

function doPost(e) {
  try {
    var pedido = JSON.parse(e.postData.contents);
    var token = PropertiesService.getScriptProperties().getProperty('TOKEN');
    if (!token) return json_({ ok: false, erro: 'Este script ainda não tem senha. Rode "configurar" no projeto ligado à planilha.' });
    if (String(pedido.token || '').trim() !== token) {
      return json_({ ok: false, erro: 'A senha não confere com a deste endereço.' });
    }

    if (pedido.acao === 'ler') return json_({ ok: true, tabelas: lerTudo_() });

    if (pedido.acao === 'gravar') {
      var trava = LockService.getScriptLock();
      trava.waitLock(20000);
      try {
        gravar_(pedido.ops || []);
      } finally {
        trava.releaseLock();
      }
      return json_({ ok: true });
    }
    return json_({ ok: false, erro: 'Ação desconhecida.' });
  } catch (err) {
    return json_({ ok: false, erro: String(err && err.message ? err.message : err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function lerTudo_() {
  var ss = SpreadsheetApp.getActive();
  var saida = {};
  Object.keys(TABELAS).forEach(function (nome) { saida[nome] = lerAba_(ss.getSheetByName(nome)); });
  return saida;
}

function lerAba_(aba) {
  if (!aba || aba.getLastRow() < 2) return [];
  var valores = aba.getDataRange().getValues();
  var cab = valores[0].map(String);
  var linhas = [];
  for (var i = 1; i < valores.length; i++) {
    var obj = {};
    for (var j = 0; j < cab.length; j++) obj[cab[j]] = texto_(valores[i][j]);
    if (obj.id !== '') linhas.push(obj);
  }
  return linhas;
}

/** A planilha transforma datas digitadas em "data"; devolvemos sempre AAAA-MM-DD. */
function texto_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'America/Sao_Paulo', 'yyyy-MM-dd');
  return v;
}

function gravar_(ops) {
  var ss = SpreadsheetApp.getActive();
  var porTabela = {};
  ops.forEach(function (op) {
    if (!TABELAS[op.tabela]) throw new Error('Tabela desconhecida: ' + op.tabela);
    (porTabela[op.tabela] = porTabela[op.tabela] || []).push(op);
  });

  Object.keys(porTabela).forEach(function (nome) {
    var aba = garantirAba_(ss, nome, TABELAS[nome]);
    var cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(String);
    var colId = cab.indexOf('id');
    var linhas = aba.getLastRow() > 1
      ? aba.getRange(2, 1, aba.getLastRow() - 1, cab.length).getValues().map(function (l) { return l.map(texto_); })
      : [];
    var indice = {};
    linhas.forEach(function (l, i) { if (l[colId] !== '') indice[String(l[colId])] = i; });

    porTabela[nome].forEach(function (op) {
      var id = String(op.linha.id);
      if (op.op === 'apagar') {
        if (id in indice) { linhas[indice[id]] = null; delete indice[id]; }
        return;
      }
      var atual = id in indice ? linhas[indice[id]] : cab.map(function () { return ''; });
      cab.forEach(function (c, j) { if (c in op.linha) atual[j] = op.linha[c]; });
      if (!(id in indice)) { indice[id] = linhas.length; linhas.push(atual); }
    });

    var finais = linhas.filter(function (l) { return l !== null; });
    var corpo = aba.getRange(2, 1, Math.max(aba.getMaxRows() - 1, 1), cab.length);
    corpo.clearContent();
    if (finais.length) {
      if (aba.getMaxRows() < finais.length + 1) aba.insertRowsAfter(aba.getMaxRows(), finais.length + 1 - aba.getMaxRows());
      // valores em dinheiro ficam como número (dá para somar na planilha);
      // o resto vai como texto puro, para a planilha não mexer em telefones e datas
      var formatos = cab.map(function (c) { return c === 'valor' && nome !== 'config' ? '0.00' : '@'; });
      aba.getRange(2, 1, finais.length, cab.length)
        .setNumberFormats(finais.map(function () { return formatos; }))
        .setValues(finais);
    }
  });
}

// ---------- importação das fichinhas em papel ----------

/**
 * Lê a aba "Importar" (mesmas colunas da planilha modelo) e cria as clientes e
 * as parcelas. Linhas já importadas ficam marcadas e são puladas.
 */
function importarFichinhas() {
  var ss = SpreadsheetApp.getActive();
  var ui = SpreadsheetApp.getUi();
  var aba = ss.getSheetByName(ABA_IMPORTAR);
  if (!aba || aba.getLastRow() < 2) return ui.alert('A aba "Importar" está vazia.');

  var dados = aba.getRange(2, 1, aba.getLastRow() - 1, COLUNAS_IMPORTAR.length).getValues();
  var existentes = {};
  lerAba_(ss.getSheetByName('clientes')).forEach(function (c) { existentes[normalizar_(c.nome)] = String(c.id); });

  var ops = [];
  var erros = [];
  var feitas = 0;
  var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');

  dados.forEach(function (l, i) {
    var nome = String(l[0]).trim();
    if (!nome || l[9] !== '') return;
    var saldo = Math.round(Number(l[2]) * 100);
    var n = Math.floor(Number(l[3]));
    var valorParcela = Math.round(Number(l[4]) * 100) || 0;
    var dia = Math.floor(Number(l[5]));
    var proximo = l[6] instanceof Date ? Utilities.formatDate(l[6], 'America/Sao_Paulo', 'yyyy-MM-dd') : String(l[6]).trim();
    var atraso = Math.round(Number(l[7]) * 100) || 0;

    if (!(saldo > 0) || !(n >= 1) || !(dia >= 1 && dia <= 31) || !/^\d{4}-\d{2}-\d{2}$/.test(proximo) || atraso > saldo) {
      erros.push('Linha ' + (i + 2) + ' (' + nome + '): confira saldo, parcelas, dia e próximo vencimento.');
      return;
    }

    var chave = normalizar_(nome);
    var clienteId = existentes[chave];
    if (!clienteId) {
      clienteId = Utilities.getUuid();
      existentes[chave] = clienteId;
      ops.push({ tabela: 'clientes', op: 'salvar', linha: {
        id: clienteId, nome: nome, whatsapp: String(l[1]).replace(/\D/g, ''), obs: String(l[8]).trim(), criado_em: agora
      } });
    }

    var parcelas = [];
    if (atraso > 0) parcelas.push({ vencimento: somarMeses_(proximo, -1, dia), valor: atraso, descricao: 'Saldo em atraso (fichinha em papel)' });
    var resto = saldo - atraso;
    var base = valorParcela || Math.floor(resto / n);
    for (var k = 0; k < n && resto > 0; k++) {
      var v = k === n - 1 ? resto : Math.min(base, resto);
      parcelas.push({ vencimento: somarMeses_(proximo, k, dia), valor: v, descricao: 'Fichinha em papel (' + (k + 1) + '/' + n + ')' });
      resto -= v;
    }
    parcelas.forEach(function (p) {
      ops.push({ tabela: 'parcelas', op: 'salvar', linha: {
        id: Utilities.getUuid(), cliente_id: clienteId, venda_id: '', descricao: p.descricao,
        vencimento: p.vencimento, valor: p.valor / 100
      } });
    });
    aba.getRange(i + 2, 10).setValue(agora);
    feitas++;
  });

  if (ops.length) gravar_(ops);
  ui.alert(feitas + ' fichinha(s) importada(s).' + (erros.length ? '\n\nNão importadas:\n' + erros.join('\n') : ''));
}

function normalizar_(t) {
  return String(t).trim().toLowerCase();
}

/** Soma meses mantendo o dia combinado; se o mês não tem o dia, usa o último. */
function somarMeses_(iso, meses, dia) {
  var p = iso.split('-').map(Number);
  var total = p[0] * 12 + (p[1] - 1) + meses;
  var ano = Math.floor(total / 12);
  var mes = (total % 12) + 1;
  var d = Math.min(dia, new Date(ano, mes, 0).getDate());
  return ano + '-' + ('0' + mes).slice(-2) + '-' + ('0' + d).slice(-2);
}
