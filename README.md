# Ferramenta da QA

Aplicação estática para preservar documentos, separar entregas e preparar cenários de teste. Funciona no GitHub Pages e no aplicativo desktop sem conta, banco de dados, backend, API de inteligência artificial ou serviço externo obrigatório.

## Acessar pela web

A versão web oficial fica em:

<https://ericasouzaqa.github.io/Ferramenta-da-QA/>

O site é publicado automaticamente pelo workflow do GitHub Pages quando há alteração na branch `main`. O build usa o subcaminho do repositório para resolver scripts, estilos, favicon e demais assets.

## Executar localmente

Requisitos: Node.js 22 e pnpm.

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm dev
```

Para validar e gerar a aplicação web estática:

```bash
pnpm check
pnpm test
pnpm build
```

O build fica em `dist/public`. Para simular a versão hospedada localmente, use o preview do Vite:

```bash
pnpm start
```

## Aplicativo desktop

Para abrir o aplicativo durante o desenvolvimento:

```bash
pnpm desktop:dev
```

Para gerar o executável portátil do Windows:

```bash
pnpm desktop:win
```

O executável fica em `release/Ferramenta-da-QA-1.1.0-portable.exe`. Depois de gerado, ele funciona localmente sem internet. A execução final deve ser conferida em uma máquina Windows real.

## Persistência local

A fonte textual é mantida no armazenamento local do navegador. Os dados pertencem ao perfil e ao dispositivo em que foram inseridos. Não existe sincronização entre máquinas, banco de dados, conta de usuário ou cópia automática para a nuvem. Limpar os dados do navegador pode remover a fonte salva.

## Fluxo de uso

O fluxo da aplicação é exclusivamente:

**Fonte → Organização por entrega → Cenários STEP → Gherkin → Exportação**

Na etapa **Fonte**, cole o texto original ou leia um PDF, XLSX, TXT, imagem ou log. Revise o conteúdo incorporado e confirme a leitura integral antes de organizar.

Na etapa **Organização por entrega**, confira os blocos separados por marcadores `STEP`, títulos ou referências explícitas repetidas. Conteúdo que não possa ser interpretado com segurança continua disponível para revisão.

Na etapa **Cenários STEP**, confira referência, pré-condições, passos, resultado esperado e GAPs. Cada cenário possui no máximo oito passos. Funcionalidades maiores são divididas em STEPs complementares.

Na etapa **Gherkin**, a saída só é criada quando título, pré-condições, passos e resultado esperado existem explicitamente na fonte. Na etapa **Exportação**, copie STEP ou Gherkin para colagem manual no YouTrack ou baixe o CSV local. A ferramenta não acessa o YouTrack.

## Formatos e limitações

PDF textual é lido pela camada de texto disponível e organizado por página. Tabelas PDF preservam a estrutura textual disponível, mas tabelas complexas precisam de conferência visual. PDFs escaneados não recebem OCR. Imagens e páginas PDF são preservadas para conferência local, sem descrição automática. XLSX preserva abas, cabeçalhos, linhas e células lidas. TXT e logs são incorporados com nome e conteúdo.

O processamento é determinístico. Texto desformatado sem marcadores seguros não é interpretado semanticamente. Quando algo não é reconhecido, o material original permanece preservado e a aplicação registra um GAP. É preferível manter uma lacuna explícita a criar uma informação incorreta.

## Validação e manutenção

Antes de aceitar uma alteração, execute:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm test
pnpm build
pnpm audit --prod --audit-level high
pnpm desktop:win
```

Valide também a URL do GitHub Pages, a importação dos formatos suportados, a cópia, o CSV, a recarga e o comportamento do executável em Windows. Não considere uma mudança pronta apenas porque compilou.

As regras do organizador estão em `client/src/lib/qa-organizer.ts`. Os leitores ficam em `client/src/lib/pdf-reader.ts`, `client/src/lib/xlsx-reader.ts` e `client/src/lib/evidence-sources.ts`. A interface está em `client/src/pages/Home.tsx` e os estilos em `client/src/index.css`. O workflow de publicação fica em `.github/workflows/deploy-pages.yml`.
