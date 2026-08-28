# Ferramenta da QA

Aplicação local para ler requisitos e evidências, organizar cenários de teste e preparar cards de bug. O núcleo funciona no navegador e no aplicativo desktop, sem autenticação, conta Manus ou serviço externo.

## Executar

Requisitos: Node.js 22 e pnpm 10.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Para validar e gerar a aplicação:

```bash
pnpm check
pnpm test
pnpm build
```

Para abrir o aplicativo desktop:

```bash
pnpm desktop:dev
```

Para gerar o executável portátil do Windows:

```bash
pnpm desktop:win
```

## Uso

Cole um texto ou importe um PDF, uma planilha XLSX, uma imagem de erro ou um log na aba **Fonte**. Revise o conteúdo preservado e confirme a leitura integral antes de organizar o material. A aplicação mantém a origem, separa os contextos e marca informações ausentes como **a confirmar**.

A geração dos casos segue o formato STEP, com pré-condições, passos, resultado esperado e gaps e indefinições. O Gherkin é mantido quando a fonte contém dados suficientes. Nenhum fato é criado por inferência.

PDFs sem camada de texto e imagens sem descrição fornecida ficam marcados para confirmação manual. A aplicação não inventa conteúdo.

## Publicação

O GitHub Pages é publicado pelo workflow `.github/workflows/deploy-pages.yml`. O caminho base é calculado pelo nome atual do repositório e o arquivo `404.html` preserva o carregamento das rotas da aplicação.

## Estrutura

| Caminho | Responsabilidade |
| --- | --- |
| `client/src/pages/Home.tsx` | Fluxo principal, importação, organização e exportação |
| `client/src/lib/` | Leitura local e regras de organização |
| `client/src/index.css` | Tokens e estilos globais |
| `desktop/main.cjs` | Inicialização do Electron |
| `.github/workflows/` | Validação e publicação |
