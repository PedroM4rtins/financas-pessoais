# Prompt para criar o projeto "Finanças Pessoais" (cole no Copilot Chat / Claude Code / Cursor no VS Code)

> **Antes de colar:** crie a pasta do projeto e coloque o arquivo `prototipo-financas.html` em `docs/prototipo.html`. O prompt usa esse arquivo como referência visual.

---

Você é um engenheiro full-stack sênior. Crie do zero um projeto web chamado **`financas-pessoais`**, que será publicado como repositório público no GitHub. Trabalhe em etapas, criando todos os arquivos necessários, e ao final rode o projeto para confirmar que builda sem erros.

## 1. Objetivo

Um site onde eu importo os **PDFs das minhas faturas de cartão e extratos bancários** (ex.: Nubank, Inter, Itaú, Bradesco, C6, Mercado Pago). O site:

1. **Lê o PDF** e extrai cada transação (data, descrição/nome, CNPJ/CPF quando houver, valor, tipo: compra, Pix enviado, Pix recebido, estorno, parcela X/Y).
2. **Classifica automaticamente** cada transação em uma categoria (Alimentação, Transporte, Lazer, Moradia, Saúde, Compras, Assinaturas, Educação, Outros).
3. O que não conseguir classificar fica como **"Não classificado"** e aparece numa tela de **Revisão**, agrupado por nome/CNPJ.
4. Na revisão eu escolho a categoria e marco **"aplicar sempre"**, o que cria uma **regra**. Exemplo: Pix de R$ 10 para "JORGE DA SILVA": eu defino que sempre que aparecer "JORGE DA SILVA" é Alimentação. A regra vale para transações antigas e futuras.
5. Mostra um **dashboard com gráficos**: gasto por categoria no mês (rosca), evolução mensal (barras empilhadas por categoria), maiores estabelecimentos e comparação com o mês anterior.
6. Mostra tudo numa **planilha** (tabela editável) e permite **exportar para .xlsx e .csv**.

## 2. Stack (obrigatória)

- **Vite + React + TypeScript** (strict mode)
- **Tailwind CSS** para estilo
- **pdfjs-dist** para ler o PDF **no navegador** (nada de enviar PDF para servidor)
- **Dexie.js (IndexedDB)** para guardar transações, regras e categorias localmente
- **Recharts** para os gráficos
- **SheetJS (xlsx)** para exportar planilha
- **Vitest** para testes
- **React Router** para as páginas
- Deploy em **GitHub Pages** via GitHub Actions (configure o `base` do Vite)

> Motivo: tudo roda 100% no navegador, sem backend e sem custo, e meus dados financeiros nunca saem da minha máquina.

## 3. Estrutura de pastas

```
src/
  app/              # rotas e layout (sidebar + conteúdo)
  pages/            # Dashboard, Importar, Transacoes, Revisao, Regras, Categorias, Configuracoes
  components/       # UI reutilizável (Card, Table, CategoryBadge, Dropzone, MonthPicker...)
  features/
    import/         # leitura de PDF + parsers por banco
      pdfText.ts    # extrai texto com pdfjs, preservando linhas (agrupar itens por coordenada Y)
      parsers/
        types.ts    # interface BankParser { id, name, detect(text): boolean, parse(text): RawTransaction[] }
        nubank.ts
        inter.ts
        itau.ts
        generic.ts  # fallback por regex: data (dd/mm ou dd/mm/aaaa) + descrição + valor (R$ 1.234,56)
        index.ts    # registry: tenta detect() de cada parser, cai no generic
    classify/
      normalize.ts  # normaliza descrições
      rules.ts      # motor de regras
      defaultKeywords.ts  # dicionário inicial de palavras-chave → categoria
    charts/
  db/               # schema Dexie + repositórios
  lib/              # formatação de moeda (pt-BR, BRL), datas, hash
  tests/
```

## 4. Modelo de dados

```ts
type Transaction = {
  id: string;                 // hash(data + descricaoOriginal + valor + arquivoOrigem + indice) para evitar duplicata
  date: string;               // ISO yyyy-mm-dd
  rawDescription: string;     // texto original do PDF
  name: string;               // descrição normalizada (ex.: "JORGE DA SILVA")
  document?: string;          // CNPJ/CPF só com dígitos, se encontrado
  amount: number;             // em centavos; negativo = saída, positivo = entrada
  kind: 'compra' | 'pix_enviado' | 'pix_recebido' | 'estorno' | 'tarifa' | 'outro';
  installment?: { current: number; total: number };
  categoryId: string | null;  // null = não classificado
  classifiedBy: 'regra_usuario' | 'palavra_chave' | 'manual' | null;
  ruleId?: string;
  sourceFileId: string;
  bank: string;
};

type Rule = {
  id: string;
  field: 'name' | 'document';
  operator: 'equals' | 'contains' | 'startsWith' | 'regex';
  value: string;              // já normalizado
  categoryId: string;
  priority: number;           // maior vence
  createdAt: string;
};

type Category = { id: string; name: string; color: string; icon: string; budget?: number };
type ImportedFile = { id: string; fileName: string; bank: string; period: string; importedAt: string; count: number };
```

## 5. Regras de normalização (`normalize.ts`)

- Maiúsculas, sem acento, espaços colapsados.
- Remover prefixos de meio de pagamento: `PIX ENVIADO`, `PIX RECEBIDO`, `TRANSFERENCIA ENVIADA`, `PAG*`, `PG *`, `MP*`, `IFD*`, `EC *`, `CARTAO`, `COMPRA NO DEBITO` etc.
- Remover sufixos de parcela (`PARC 02/10`, `2/10`) e guardar em `installment`.
- Extrair CNPJ (`\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}`) e CPF mascarado (`***.123.456-**`) para `document`.
- Remover cidade/UF no final quando for padrão de fatura (ex.: `UBER TRIP SAO PAULO BR` vira `UBER TRIP`).

## 6. Motor de classificação (`rules.ts`), nesta ordem de prioridade

1. **Classificação manual** da própria transação (nunca sobrescrever).
2. **Regras do usuário**: primeiro por `document` (CNPJ é mais confiável), depois por `name`, respeitando `priority`.
3. **Dicionário de palavras-chave padrão** (`defaultKeywords.ts`), por exemplo:
   - Alimentação: IFOOD, RAPPI, MERCADO, SUPERMERC, PADARIA, RESTAURANTE, CARREFOUR, ASSAI, PAO DE ACUCAR, BURGER, MCDONALDS, LANCHONETE
   - Transporte: UBER, 99, 99APP, POSTO, SHELL, IPIRANGA, ESTAPAR, SEM PARAR, METRO, BILHETE UNICO
   - Lazer: CINEMA, INGRESSO, SYMPLA, STEAM, BAR, CINEMARK
   - Assinaturas: NETFLIX, SPOTIFY, AMAZON PRIME, DISNEY, YOUTUBE, ICLOUD, GOOGLE ONE, CHATGPT
   - Saúde: DROGA, FARMACIA, RAIA, DROGASIL, PAGUE MENOS, CLINICA, LABORATORIO, SMARTFIT
   - Moradia: ENEL, SABESP, COMGAS, CONDOMINIO, ALUGUEL, VIVO, CLARO, TIM
   - Compras: AMAZON, MERCADOLIVRE, SHOPEE, MAGALU, SHEIN, RENNER
4. Senão: `categoryId = null` (Não classificado).

- Ao criar/editar/excluir uma regra, **reclassificar todas** as transações afetadas (exceto as manuais) e mostrar um toast: "Regra aplicada a N transações".
- Pix recebido e estornos **não** entram no total de gastos (mostrar separado como "Entradas").

## 7. Páginas

1. **Dashboard**: seletor de mês; cards de KPI (total gasto, variação vs mês anterior, nº de transações, nº não classificadas com link para Revisão); gráfico de rosca por categoria; barras empilhadas dos últimos 6 meses; top 5 estabelecimentos; barra de orçamento por categoria (se tiver `budget`).
2. **Importar**: dropzone para vários PDFs; mostra banco detectado, período, quantidade de transações e prévia antes de confirmar; avisa sobre duplicatas; tratar PDF com senha (pedir a senha, já que muitos bancos protegem a fatura com CPF) e PDF escaneado sem texto (mensagem clara de que não é suportado ainda).
3. **Transações (planilha)**: tabela com ordenação, busca, filtro por categoria/mês/banco; troca de categoria inline por select; ao trocar, perguntar "Aplicar sempre para 'NOME'?" (sim = cria regra, não = manual); botões Exportar XLSX e CSV.
4. **Revisão**: lista de não classificados **agrupados por nome/CNPJ** (ex.: "JORGE DA SILVA, 3 transações, R$ 42,00"); para cada grupo: escolher categoria + checkbox "sempre" (marcado por padrão) + botão "Ignorar".
5. **Regras**: CRUD de regras (campo, operador, valor, categoria, prioridade), com contador de quantas transações cada regra afeta e um "testar regra" com prévia.
6. **Categorias**: CRUD com cor, ícone e orçamento mensal.
7. **Configurações**: exportar/importar backup JSON (transações + regras + categorias), apagar todos os dados.

## 8. Identidade visual (seguir o protótipo)

O arquivo **`docs/prototipo.html`** deste repositório é a referência visual oficial. **Abra e leia esse arquivo antes de criar qualquer componente** e reproduza fielmente o layout, as cores, os espaçamentos, os componentes e as interações dele em React + Tailwind. Não invente outro estilo.

Configure estes tokens no `tailwind.config.ts` (em `theme.extend`) e use só eles:

```ts
colors: {
  bg: '#F5F3EE',          // fundo da página (off-white quente)
  panel: '#FFFFFF',       // cards
  ink: '#1C1F24',         // texto principal
  muted: '#6B6F76',       // texto secundário
  line: '#E6E2D9',        // bordas e divisórias
  sidebar: { DEFAULT: '#16201D', hover: '#22302C', active: '#2A3B36', text: '#CFD8D4' },
  accent: { DEFAULT: '#1F6F5C', soft: '#E3F0EB' },   // verde principal (botões, foco)
  warn: { DEFAULT: '#B4541A', soft: '#FBEDE3' },     // alertas, "sem categoria", estouro de orçamento
},
borderRadius: { card: '14px', btn: '9px' },
fontFamily: { sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'] },
```

Cores padrão das categorias (seed do banco, editáveis pelo usuário):

| Categoria | Cor | Emoji |
|---|---|---|
| Alimentação | `#E07A3F` | 🍔 |
| Transporte | `#3A7BD5` | 🚗 |
| Lazer | `#9B5DE5` | 🎬 |
| Moradia | `#2A9D8F` | 🏠 |
| Saúde | `#E5484D` | 💊 |
| Compras | `#C9971A` | 🛍️ |
| Assinaturas | `#5C6B7A` | 🔁 |
| Outros | `#8D7B68` | 📦 |
| Não classificado | `#C9C3B6` | ❓ |

Padrões de UI do protótipo que devem ser mantidos:
- **Layout:** sidebar escura fixa de 232px à esquerda (logo, navegação com ícone + texto, badge laranja com o número de pendências em "Revisar", aviso de privacidade no rodapé). Conteúdo com largura máxima de 1240px e padding de 28px/34px. Em telas < 900px a sidebar vira uma barra horizontal no topo.
- **Cabeçalho de página:** título de 24px em negrito (letter-spacing -0.02em), subtítulo em `muted`, e ações ou seletor de mês alinhados à direita.
- **Cards:** fundo branco, borda 1px `line`, raio de 14px, padding de 18px, título do card em 13px semibold `muted`. Sem sombras pesadas.
- **KPIs:** 4 cards em grid. Valor em 26px bold com `tabular-nums`. O card "Sem categoria" usa o fundo `warn.soft` e é clicável (leva para Revisão).
- **Badges de categoria:** pílula com fundo na cor da categoria a ~13% de opacidade (`${cor}22`), texto na cor da categoria, um ponto colorido e o emoji.
- **Tabela:** cabeçalho em 12px, maiúsculas, fundo `#FAF9F6`. Linhas não classificadas com fundo `#FFF8F2`. Valores alinhados à direita com `tabular-nums`. Embaixo da descrição normalizada, a descrição original do PDF e o CNPJ/CPF em fonte mono, menores e em `muted`. Embaixo do select de categoria, a origem da classificação ("via sua regra", "via palavra-chave", "aguardando você").
- **Popover ao trocar categoria:** "Sempre classificar **X** como **Y**? Também atualiza mais N transações", com os botões "Sim, sempre" e "Só esta".
- **Revisão:** um grupo por nome/CNPJ, com nome em negrito, contagem + total + documento, chips com data/valor de cada transação, select de categoria, checkbox "Aplicar sempre" já marcado e botão Salvar. Quando não sobrar nada: estado vazio com 🎉.
- **Importar:** dropzone com borda tracejada verde e fundo `accent.soft`, lista de arquivos com ícone "PDF" vermelho, banco detectado, período, barra de progresso e "✓ N transações".
- **Gráficos:** rosca com espessura de 26px e o total no centro, legenda ao lado (cor, nome, %, valor); barras empilhadas por categoria com o mês atual em destaque; barras horizontais finas para top estabelecimentos e orçamento (cor `warn` quando passa de 100%).
- **Toasts:** escuros (`#16201D`), centralizados embaixo, somem em ~3s. Usar para "Regra criada… aplicada a N transações", importação concluída, duplicata ignorada e exportação.
- **Botões:** primário verde `accent`; secundário "ghost" com borda `line`.
- Foco visível com outline de 2px `accent`. Animação de entrada das páginas: fade + translateY(4px) em 200ms.
- Moeda sempre no formato `R$ 1.234,56`.

Depois de montar o layout base, compare lado a lado com `docs/prototipo.html` e ajuste as diferenças.

## 9. Qualidade

- Testes com Vitest para: `normalize`, motor de regras (prioridade CNPJ > nome > palavra-chave; manual nunca é sobrescrito), parser genérico e pelo menos um parser de banco usando **texto de exemplo fictício** em `src/tests/fixtures/*.txt`.
- Valores sempre em centavos (inteiros) para evitar erro de ponto flutuante; formatar com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- Interface toda em português, responsiva, com tema claro/escuro.
- Acessibilidade básica (labels, foco visível, contraste).

## 10. Repositório GitHub

- `.gitignore` incluindo `*.pdf`, `faturas/`, `*.xlsx`, `.env*` (**nunca** versionar faturas reais).
- `README.md` em português com: descrição, print do dashboard, como rodar (`npm install`, `npm run dev`), como adicionar um parser de banco novo, aviso de privacidade (tudo local) e roadmap.
- `LICENSE` MIT.
- Workflow `.github/workflows/deploy.yml` para GitHub Pages e outro `ci.yml` rodando lint + testes em PR.
- ESLint + Prettier configurados.
- Commits pequenos e descritivos (Conventional Commits).

## 11. Ordem de implementação

1. Scaffold (Vite, Tailwind com os tokens da seção 8, Router, layout com sidebar idêntico ao protótipo)
2. Banco Dexie + categorias padrão (seed)
3. `pdfText.ts` + parser genérico + tela Importar com prévia
4. Normalização + motor de regras + testes
5. Página Transações (planilha) + exportação
6. Página Revisão + criação de regras com reclassificação
7. Dashboard com gráficos
8. Regras, Categorias, Configurações
9. Parsers específicos de banco
10. README, CI e deploy

Antes de começar, me mostre o plano de arquivos e pergunte qual banco eu uso primeiro, para priorizar o parser certo. Depois de cada etapa, rode `npm run build` e `npm test` e corrija os erros antes de seguir.

## Roadmap (não implementar agora, só deixar no README)

- Classificação por IA (enviar só o nome normalizado, nunca o PDF) como sugestão opcional
- OCR para PDFs escaneados (tesseract.js)
- Importar OFX/CSV
- Metas e alertas de orçamento
