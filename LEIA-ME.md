# Fome & Justiça — ficha com 1.000 novas perks

Abra `Ficha-Tokyo-Ghoul.html` diretamente no navegador. Use Exportar na versão anterior e Importar nesta versão para transferir seus personagens. Os personagens não estão incorporados ao HTML distribuído.

## Catálogo adicionado

As 1.000 entradas do suplemento `Fome_e_Justica_1000_Novas_Perks.pdf` foram preservadas com seus nomes, custos, efeitos, tipos de uso e códigos P0001–P1000.

- 600 vantagens distribuídas entre Força, Vigor, Precisão, Agilidade, Raciocínio, Percepção, Presença e Controle.
- 400 técnicas em Kakuhou & arma, com filtros Ukaku, Koukaku, Rinkaku, Bikaku, Quimera, Kakuja, Quinque e Quinx / Arata.
- Requisitos de Grau arredondados para cima até o próximo número par: 1 → 2, 3 → 4, 5 → 6 etc. A associação a um atributo não acrescenta requisito numérico inexistente no PDF.
- Compra única, registro em PE, remoção, salvamento e importação/exportação. Compra bloqueada quando faltam Grau, estrutura, espécie ou desbloqueio aplicável.
- Efeitos situacionais continuam sendo resolvidos na mesa conforme suas descrições. A compra não aplica automaticamente bônus condicionais, nem aumenta RC máximo ou Dureza. Custos do suplemento são integrais e não recebem descontos de criação.
- Requisitos de uso como órgão manifestado, Frame, equipamento específico, preparação e consentimento permanecem no texto. Possuir a perk não dispensa essas condições.

As regras gerais do suplemento podem ser consultadas no bloco expansível de Vantagens e de novas perks de Kakuhou.

## Desenvolvimento

```sh
npm ci
npm run build:portable
node scripts/package-portable.mjs
node --test --test-concurrency=1 tests/vats.test.mjs tests/catalog-stacks.test.mjs
```

Catálogo: `app/thousand-perks.json`. Importador reproduzível: `scripts/import-thousand-perks.py`, com Python e pypdf; recebe o caminho do PDF como argumento. Os códigos e páginas de origem ficam registrados para conferência.
