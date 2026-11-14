# Como ligar o app à planilha do Google

Feito uma vez só, no computador, com a conta Google onde a planilha vai ficar.

## 1. Criar a planilha

1. Abra https://sheets.new e dê o nome **Alma Livre — dados**.
2. No menu, vá em **Extensões › Apps Script**.
3. Apague o que estiver no editor e cole todo o conteúdo do arquivo `Code.gs` desta pasta.
4. Clique em **Salvar** (ícone de disquete).

## 2. Configurar

1. No editor do Apps Script, escolha a função **configurar** na lista ao lado do botão
   **Executar** e clique em **Executar**.
2. O Google vai pedir autorização. Escolha sua conta, clique em **Avançado** e depois em
   **Acessar (não seguro)**. O aviso aparece porque o script é seu e não passou pela
   revisão do Google; ele só acessa esta planilha.
3. Volte à planilha: as abas `clientes`, `parcelas`, `recebimentos`, `config` e `Importar`
   foram criadas.

## 3. Publicar

1. No editor do Apps Script: **Implantar › Nova implantação**.
2. Em **Selecionar tipo** (engrenagem), escolha **App da Web**.
3. **Executar como**: *Eu*. **Quem pode acessar**: *Qualquer pessoa*.
   (O app só é atendido com a senha de conexão; sem ela o script recusa o pedido.)
4. Clique em **Implantar**.

## 4. Conectar o app

1. Recarregue a planilha. Aparece o menu **Alma Livre**.
2. **Alma Livre › Código de conexão**: copie o código inteiro.
3. No app, no iPhone: **Ajustes › Código de conexão**, cole e toque em **Conectar**.
   Envie o código para o iPhone por um meio privado (AirDrop, mensagem para você mesmo).

## Importar as fichinhas em papel

1. Cole as linhas da planilha modelo na aba **Importar**, a partir da linha 2
   (mesma ordem de colunas; deixe a coluna "Importado em" vazia).
2. **Alma Livre › Importar fichinhas da aba "Importar"**.
3. As linhas importadas ficam marcadas com a data e não são importadas de novo.

## Quando o código do script mudar

Cole o novo `Code.gs`, salve e vá em **Implantar › Gerenciar implantações ›
Editar (lápis) › Versão: Nova versão › Implantar**. O endereço e o código de conexão
continuam os mesmos.

## Cuidados com a planilha

- Não renomeie as abas nem os cabeçalhos da linha 1.
- Pode corrigir valores direto nas células; o app pega a mudança na próxima atualização.
- Para suas análises, crie abas novas: o app não mexe nelas.
