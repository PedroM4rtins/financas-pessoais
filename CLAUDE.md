# Instruções para o Claude Code

## Fluxo obrigatório: branch, PR, Argos e só então merge

Toda mudança neste repositório segue este fluxo, sem exceção:

1. **Branch.** Nunca commitar nem dar push direto na `main`. Antes de editar, crie
   uma branch a partir da `main` atualizada (`feat/...`, `fix/...`, `chore/...`,
   `docs/...`).
2. **PR.** Commite na branch, dê push e abra a PR para a `main` com `gh pr create`.
3. **Argos.** Logo depois de abrir a PR, rode `/argos <número-da-PR>`. Se a PR
   receber push novo, rode o Argos de novo: o veredito vale só para o commit
   analisado.
4. **Merge só com go.** O merge acontece apenas depois do veredito **go** do Argos,
   e quem faz é o próprio Argos. Com **no-go**, corrija na mesma branch e rode o
   Argos outra vez.

Nunca faça merge manual, nunca use `gh pr merge --admin` e nunca desative ou
afrouxe a proteção da `main` para contornar o Argos ou o CI. A `main` exige os
checks `check` (lint, testes e build) e `argos`, inclusive para admins.

## Skills do projeto

As skills ficam versionadas em `.claude/skills/`, para funcionarem em qualquer
máquina. A origem das instaladas pelo CLI está em `skills-lock.json`; para
atualizá-las, use `npx skills update -p` numa branch e abra PR. Antes de
instalar uma skill nova, leia o conteúdo dela inteiro: o repositório é público
e skills rodam com as permissões do agente.

A skill `graphify` precisa do programa instalado em cada máquina:
`uv tool install graphifyy==0.9.107` (o pacote tem dois "y"). A saída fica em
`graphify-out/`, fora do Git. Os hooks e o modo "sempre ligado" do graphify
(`graphify claude install`) não estão ativados neste projeto.

O `frontend-design` não é skill em `.claude/skills/`: é um plugin, ativado em
`.claude/settings.json`. Ativado não quer dizer instalado. Em cada máquina, rode
uma vez `/plugin install frontend-design@claude-plugins-official` no Claude Code
e reinicie a sessão. Sem isso, a skill não aparece e nada avisa.

## Antes de abrir a PR

Rode localmente o mesmo que o CI roda:

```bash
npm run lint && npm test && npm run build
```

## Cuidados do projeto

- Os dados do usuário existem só no IndexedDB do navegador (Dexie, `src/db/`).
  Mudança de schema é sempre uma `db.version(n+1)` nova, nunca edição de uma
  versão existente.
- O repositório é público: nada de faturas, extratos ou dados pessoais reais.
  Fixtures de teste são fictícias.
- Mudança em parser, importação ou classificação vem com teste.
