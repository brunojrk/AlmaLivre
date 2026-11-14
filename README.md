# Alma Livre

App de gestão do Ateliê Alma Livre, feito para ser usado no iPhone como um app
instalado na tela de início (PWA). Esta versão cobre as **fichinhas**: clientes,
parcelas, pagamentos, cobranças por turma e lembretes pelo WhatsApp.

Os dados ficam em uma planilha do Google. Veja como ligar a planilha em
[apps-script/INSTALAR.md](apps-script/INSTALAR.md).

## Rodar no computador

```bash
npm install
```

```bash
npm run dev
```

## Testar e gerar a versão final

```bash
npm test
```

```bash
npm run build
```

A pasta `dist/` gerada pode ser publicada em qualquer hospedagem de site estático.
