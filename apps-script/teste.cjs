// Simulação mínima do Apps Script para exercitar o Code.gs fora do Google.
const fs = require('fs'), assert = require('assert');
const a1 = (s) => { const m = /^([A-Z])(\d+)(?::([A-Z])(\d+))?$/.exec(s); const c = m[1].charCodeAt(0) - 64, r = +m[2];
  return [r, c, m[4] ? +m[4] - r + 1 : 1, m[3] ? m[3].charCodeAt(0) - 64 - c + 1 : 1]; };
class Range { constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
  getValues() { const o = []; for (let i = 0; i < this.nr; i++) { const l = []; for (let j = 0; j < this.nc; j++) l.push((this.sh.d[this.r - 1 + i] || [])[this.c - 1 + j] ?? ''); o.push(l); } return o; }
  getValue() { return this.getValues()[0][0]; }
  setValues(v) { v.forEach((l, i) => l.forEach((x, j) => { (this.sh.d[this.r - 1 + i] ||= [])[this.c - 1 + j] = x; })); return this; }
  setValue(x) { return this.setValues([[x]]); }
  clearContent() { for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) if (this.sh.d[this.r - 1 + i]) this.sh.d[this.r - 1 + i][this.c - 1 + j] = ''; return this; }
  setNumberFormat() { return this; } setNumberFormats() { return this; } setFontWeight() { return this; } setBackground() { return this; } setFontColor() { return this; } }
class Sheet { constructor(n) { this.n = n; this.d = []; this.hidden = false; }
  getRange(r, c, nr = 1, nc = 1) { if (typeof r === 'string') [r, c, nr, nc] = a1(r); return new Range(this, r, c, nr, nc); }
  getLastRow() { let n = 0; this.d.forEach((l, i) => { if (l && l.some(x => x !== '' && x != null)) n = i + 1; }); return n; }
  getLastColumn() { let n = 0; this.d.forEach(l => l && l.forEach((x, j) => { if (x !== '' && x != null) n = Math.max(n, j + 1); })); return n; }
  getMaxRows() { return 1000; } insertRowsAfter() {} setFrozenRows() {} setColumnWidth() {} hideSheet() { this.hidden = true; }
  getDataRange() { return this.getRange(1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1)); } }
const ss = { sheets: {}, getSheetByName(n) { return this.sheets[n] || null; }, insertSheet(n) { return this.sheets[n] = new Sheet(n); },
  setSpreadsheetTimeZone() {}, getSheets() { return Object.values(this.sheets); }, deleteSheet(s) { delete this.sheets[s.n]; } };
const alerts = []; let promptResp = '';
const ui = { alert: (...a) => alerts.push(a.join(' | ')), Button: { OK: 'OK' }, ButtonSet: { OK_CANCEL: 1, OK: 0 },
  prompt: () => ({ getSelectedButton: () => 'OK', getResponseText: () => promptResp }), showModalDialog: (h, t) => alerts.push('DIALOG:' + h.c),
  createMenu() { const m = { addItem: () => m, addSeparator: () => m, addToUi() {} }; return m; } };
const props = {}; let uuid = 0;
const G = { SpreadsheetApp: { getActive: () => ss, getUi: () => ui },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] ?? null, setProperty: (k, v) => { props[k] = v; } }) },
  Utilities: { getUuid: () => `0000000${++uuid}-aaaa-bbbb-cccc-dddddddddddd`, formatDate: (d) => d.toISOString().slice(0, 10) },
  HtmlService: { createHtmlOutput: c => ({ c, setWidth() { return this; }, setHeight() { return this; } }) },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: t => ({ t, setMimeType() { return this; } }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) }, Logger: { log: x => alerts.push('LOG:' + x) }, ScriptApp: { getScriptId: () => 'S1' } };
const code = fs.readFileSync(process.argv[2], 'utf8');
const api = new Function(...Object.keys(G), code + '\nreturn {configurar, doGet, doPost, mostrarCodigo, trocarEndereco, codigoNoRegistro, importarFichinhas, onOpen};')(...Object.values(G));
const post = (o) => JSON.parse(api.doPost({ postData: { contents: JSON.stringify(o) } }).t);

// planilha que já tinha senha antiga nas propriedades (caso real)
props.TOKEN = 'senhaantiga';
assert.equal(JSON.parse(api.doGet().t).senha_configurada, false);
api.onOpen(); api.configurar();
const senha = ss.sheets.acesso.getRange('B1').getValue();
assert.equal(senha, 'senhaantiga'); assert.ok(ss.sheets.acesso.hidden);
assert.deepEqual(JSON.parse(api.doGet().t), { ok: true, app: 'alma-livre', versao: 4, ligado_a_planilha: true, senha_configurada: true });
promptResp = 'https://errado'; api.trocarEndereco(); assert.ok(alerts.pop().includes('não parece'));
promptResp = 'https://script.google.com/macros/s/AKabc-123_x/exec'; api.mostrarCodigo();
assert.ok(alerts.pop().includes('https://script.google.com/macros/s/AKabc-123_x/exec|senhaantiga'));
api.codigoNoRegistro(); assert.ok(alerts.pop().endsWith('/exec|senhaantiga'));
// pedidos do app
assert.ok(post({ acao: 'ler', token: 'x' }).erro.includes('chegaram 1 caracteres; a senha tem 11'));
assert.deepEqual(post({ acao: 'ler', token: senha }).tabelas, { clientes: [], parcelas: [], recebimentos: [], config: [] });
assert.ok(post({ acao: 'gravar', token: senha, ops: [
  { tabela: 'clientes', op: 'salvar', linha: { id: 'c1', nome: 'Cliente Teste', whatsapp: '11999990000', obs: '', criado_em: '2026-11-01' } },
  { tabela: 'parcelas', op: 'salvar', linha: { id: 'p1', cliente_id: 'c1', venda_id: '', descricao: '1/2', vencimento: '2026-12-20', valor: 150 } },
  { tabela: 'parcelas', op: 'salvar', linha: { id: 'p2', cliente_id: 'c1', venda_id: '', descricao: '2/2', vencimento: '2027-01-20', valor: 150 } },
  { tabela: 'config', op: 'salvar', linha: { id: 'pix', valor: 'chave' } } ] }).ok);
post({ acao: 'gravar', token: senha, ops: [{ tabela: 'parcelas', op: 'apagar', linha: { id: 'p1' } }, { tabela: 'parcelas', op: 'salvar', linha: { id: 'p2', valor: 99.9 } }] });
let t = post({ acao: 'ler', token: senha }).tabelas;
assert.equal(t.clientes[0].nome, 'Cliente Teste'); assert.equal(t.parcelas.length, 1); assert.equal(t.parcelas[0].valor, 99.9); assert.equal(t.parcelas[0].vencimento, '2027-01-20');
// importação das fichinhas
ss.sheets.Importar.getRange(2, 1, 3, 10).setValues([
  ['Ana Exemplo', 11988887777, 450, 3, '', 20, new Date('2026-12-20T12:00:00Z'), '', 'obs', ''],
  ['Bia Exemplo', '', 380, 4, 100, 5, new Date('2026-12-05T12:00:00Z'), 100, '', ''],
  ['Linha Ruim', '', 0, 1, '', 5, 'x', '', '', '']]);
api.importarFichinhas(); const msg = alerts.pop(); assert.ok(msg.startsWith('2 fichinha(s) importada(s).') && msg.includes('Linha 4'), msg);
t = post({ acao: 'ler', token: senha }).tabelas;
const de = (n) => t.parcelas.filter(p => p.cliente_id === t.clientes.find(c => c.nome === n).id).map(p => [p.vencimento, p.valor]);
assert.deepEqual(de('Ana Exemplo'), [['2026-12-20', 150], ['2027-01-20', 150], ['2027-02-20', 150]]);
assert.deepEqual(de('Bia Exemplo'), [['2026-11-05', 100], ['2026-12-05', 100], ['2027-01-05', 100], ['2027-02-05', 80]]);
api.importarFichinhas(); assert.equal(post({ acao: 'ler', token: senha }).tabelas.clientes.length, 3); // não duplica
console.log('SCRIPT OK');
