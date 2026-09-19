# Fome & Justiça — Tokyo Ghoul + VATS

## Abrir a ficha

Abra Ficha-Tokyo-Ghoul.html no Edge, Chrome ou Firefox. É um arquivo completo, sem instalação, conexão ou servidor. Use sempre o mesmo navegador e caminho para manter o salvamento local. Exporte suas fichas pelo menu ••• para fazer backup ou mudar de dispositivo. Dados salvos no site antigo não são transferidos automaticamente: exporte o JSON antigo e importe no menu da nova ficha.

## Alterações

- Visual de dossiê em preto, osso e vermelho; temas claro/escuro; layout responsivo.
- Aumentar Distância: máximo 4, ou 2 para Koukaku. No resumo: 1 + nível + bônus personalizado em metros; Koukaku: 0 + nível + bônus. Alcance nunca negativo. Para quimeras, a base em metros segue o tipo principal; o limite de compra mantém a regra da ficha (2 se contiver Koukaku).
- Aba VATS integrada e salva por personagem, incluída na duplicação, exportação e importação. Fichas antigas recebem corpo íntegro sem alterar suas escolhas.
- Todas as 32 condições corporais informadas, com descrições e efeitos; regras de Kakuhou, vazamento de RC e quebra/recuperação da Kagune.
- PV máximos por região, Vigor, Grau, RD, RC, regeneração, dureza e quantidade de caudas vêm da ficha. Vantagens e evoluções disponíveis são reconhecidas automaticamente.
- Selecione o corpo para aplicar dano, cura ou condições. Dano é líquido por padrão; marque “Descontar RD” se informar dano bruto. Os estágios de uma mesma lesão se substituem.
- Encerrar turno rola os sangramentos, aplica a perda de RC e avança os cooldowns. Regenerar é uma ação separada, limitada a uma vez por turno; calcula cura efetiva, cobrança e saldo automaticamente. Habilidades e restauração dependem da escolha de quem joga.
- Penalidades gerais alteram os testes da ficha; teste contextual calcula efeitos de braço, esforço, visão, audição, mobilidade e Atordoado. Atordoado tem botão para consumir depois do teste.
- Kakuhou destruído perde 1d6 RC imediatamente e bloqueia por 2 turnos. Kagune quebrada em T1 aguarda T2 inteiro e pode regenerar em T3 por 2 RC.
- Uso por turno, descanso e sessão é controlado. O registro mostra custos e rolagens. Fortaleza de Carne desconta automaticamente a RD extra no próximo dano corporal.

## Critérios de integração das regras

A Vida geral e os PV regionais permanecem independentes, seguindo a estrutura do VATS enviado; o material não define uma conversão entre eles. Cada região tem a Vida máxima calculada pela ficha. O resumo mostra a quantidade de regiões afetadas e abre o monitor.

Para regeneração passiva, preservou-se o algoritmo executado no HTML original: acumular PV realmente curados em todas as regiões; cada (Vida máxima + nível de regeneração) custa 2 RC, conservando o restante. A fórmula divergente do texto antigo foi substituída na interface. O valor regenerado vem da ficha (incluindo seu arredondamento de regeneração superior); Células Ágeis e Vivo como um Kami são incorporados. Membros destruídos não recebem cura comum. Se faltar RC para a cobrança prevista, a cura não ocorre e o saldo não é gasto. Cura não remove condições automaticamente.

Nos conflitos de habilidades entre os arquivos, prevalece o catálogo da ficha: Fortaleza de Carne custa 5 RC e aumenta RD, em vez de conceder 2 RC; requisitos de Centopeia e limites por sessão são respeitados. Detalhes ausentes na descrição abreviada de Canibalismo Celular usam os percentuais e bloqueios do VATS.

Efeitos sem valor numérico definido não receberam números inventados: custo extra de regeneração do estômago, perda de reação do tórax, cegueira, colisões, redução não quantificada de movimento e restrições narrativas ficam visíveis para decisão da mesa. Costelas Quebradas avisa +1 Passo antes da rolagem de dano do atacante.

## Código-fonte

O ZIP contém o projeto modificado, sem node_modules e sem histórico Git. Requer Node 22.13 ou superior. Na pasta do projeto:

    npm install --ignore-scripts
    npm run dev:portable
    npm run build:portable
    npm run test:vats

O modo portátil compila a aplicação React localmente e não depende do antigo ambiente de hospedagem. Os arquivos de infraestrutura recebidos foram mantidos como referência; a configuração original desse ambiente não veio completa no RAR. Nada foi publicado no site original.
