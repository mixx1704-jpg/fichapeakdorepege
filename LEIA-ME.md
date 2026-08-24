# Fome & Justiça — Ficha de Personagem

Criador de fichas local para a mesa, com testes no formato do Rollem, cálculo automático de atributos e perks, exportação/importação de personagens e modo escuro.

## Abrir pela internet

Use o site publicado: https://fome-justica-ficha.andrew-junior.chatgpt.site

## Publicar automaticamente no GitHub Pages

1. Crie um repositório vazio no GitHub (por exemplo, `fome-justica-ficha`).
2. Envie todos os arquivos desta pasta para a branch `main`.
3. No repositório, abra **Settings → Pages**.
4. Em **Build and deployment**, selecione **GitHub Actions**.

O arquivo `.github/workflows/deploy-pages.yml` já está incluso. A cada alteração enviada para a branch `main`, o GitHub gera e atualiza seu Pages automaticamente. Em geral, o endereço fica assim: `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

## Rodar no seu computador

1. Instale o Node.js 22 ou superior.
2. Extraia este ZIP.
3. Abra um terminal na pasta extraída.
4. Execute `npm install` e depois `npm run dev`.
5. Abra no navegador o endereço exibido pelo terminal.

As fichas são salvas no navegador. Use os botões de exportar e importar da ficha para criar cópias de segurança ou levar personagens a outro computador.
