# Ficha Tokyo Ghoul — atualização

Abra `Ficha-Tokyo-Ghoul.html` no navegador. O arquivo funciona sem instalar programas ou iniciar um servidor.

Para transferir personagens, exporte a ficha na versão antiga e importe o JSON na versão atualizada pelo menu de opções. O salvamento local depende do navegador e do endereço/caminho do HTML.

## Novidades

- Quinques usam o catálogo universal e do seu tipo de RC, incluindo upgrades de Kakuhou e perks compatíveis. Grau, requisitos e PE continuam próprios de cada arma; opções que dependem de outra estrutura, como Kakuja e múltiplos tipos, continuam restritas.
- Passos e modificadores extras, RD adicional, seleção do tipo do alvo, ativações de técnicas/evoluções, contadores e dano por tentáculo usam os mesmos cálculos da Kagune.
- Os resultados de bloqueio e esquiva aparecem em cada Quinque, com botões para copiar. Dados extras manuais somam-se aos bônus das habilidades autorais. Dados extras de acerto não aumentam defesa.
- Habilidades autorais mostram um resumo dos dados extras de bloqueio e esquiva. Técnicas ativas só somam seus bônus quando ativadas.
- A Kagune e cada Quinque têm imagem independente, com inclusão, troca e remoção. As imagens são compactadas e incluídas na exportação/importação da ficha.
- Aprimoramentos Corporais permite escolher o atributo beneficiado na Quinque.

Efeitos narrativos e custos descritos nas técnicas continuam sendo resolvidos conforme a regra da mesa. As estatísticas da Quinque usam os atributos próprios da arma e não alteram automaticamente os do portador.

## Projeto

O código-fonte está na pasta `Update`. Para desenvolvimento, instale as dependências e use `dev:portable`; para compilar, use `build:portable` e depois `node scripts/package-portable.mjs`.

O documento ATUALIZACAO-QUINQUES.md registra a versão anterior; este arquivo descreve as mudanças atuais.
