# Ferramenta da QA

Aplicação local para preservar documentos, separar entregas e preparar cenários de teste. O fluxo mantido é:

> **Fonte → Organização por entrega → Cenários STEP → Gherkin → Exportação**

A aplicação funciona como site estático e como aplicativo desktop portátil para Windows. Não exige conta, banco de dados, backend ou serviço externo obrigatório.

## Usar sem instalar

A versão web está disponível em [ericasouzaqa.github.io/Ferramenta-da-QA](https://ericasouzaqa.github.io/Ferramenta-da-QA/).

O executável portátil para Windows pode ser baixado na [release mais recente do GitHub](https://github.com/ericasouzaqa/Ferramenta-da-QA/releases/latest). Baixe o arquivo `.exe` e execute-o em uma pasta local. Não é necessário instalar Node.js, pnpm ou outro componente.

## Funcionalidades mantidas

Na etapa **Fonte**, a ferramenta aceita texto, PDF, XLSX, TXT, imagens e logs. O conteúdo importado permanece disponível para conferência. PDFs e imagens podem passar por leitura local com OCR quando aplicável; materiais ambíguos ou ilegíveis são preservados e sinalizados para revisão, em vez de gerar informação presumida.

Na etapa **Organização por entrega**, os blocos são separados por marcadores `STEP`, títulos ou referências explícitas. Na etapa **Cenários STEP**, a aplicação organiza referência, pré-condições, dados explícitos, passos, resultado esperado e GAPs. Cada cenário recebe uma classificação informativa: **completo**, **parcial** ou **inconsistente**. Os GAPs são categorizados como funcional, critério, dados, fluxo ou técnico, sem criar soluções para ausências. A rastreabilidade registra a correspondência da funcionalidade, pré-condições, dados, passos, resultado e GAPs com a fonte original. A etapa também exibe a **Auditoria da Qualidade da Análise**, que consolida a qualidade do requisito, contagens dos STEPs, cobertura documental, GAPS, rastreabilidade, pontos de atenção e um resumo explicável. Na etapa **Gherkin**, a saída só é criada quando os campos necessários estão explicitamente disponíveis na fonte. Na etapa **Exportação**, é possível copiar STEP ou Gherkin e baixar CSV.

Os dados são mantidos localmente no perfil do navegador ou do aplicativo. Não existe sincronização entre máquinas, banco de dados, conta de usuário ou cópia automática para a nuvem.

## Desenvolvimento local

Requisitos: **Node.js 22** e **pnpm**.

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm dev
```

Para abrir a versão desktop durante o desenvolvimento:

```bash
pnpm desktop:dev
```

Para validar o projeto e gerar a versão web:

```bash
pnpm check
pnpm test
pnpm build
```

Para gerar localmente o executável portátil do Windows:

```bash
pnpm desktop:win
```

O arquivo é criado em `release/Ferramenta-da-QA-<versão>-portable.exe`. O build final para distribuição é executado no GitHub Actions em um ambiente Windows.

## Publicação de versões

O workflow `.github/workflows/release-windows.yml` executa a verificação de tipos, os testes, o build do Electron e publica o `.exe` na área de Releases quando uma tag no formato `v*` é enviada ao GitHub. O workflow `.github/workflows/deploy-pages.yml` publica a versão web na branch `main`, e `.github/workflows/quality.yml` mantém a validação contínua em pushes e pull requests.

Para publicar uma nova versão, atualize o campo `version` do `package.json`, atualize o `CHANGELOG.md`, faça commit e envie a tag correspondente:

```bash
git tag v1.4.0
git push origin v1.4.0
```

## Estrutura essencial

A interface principal fica em `client/src/pages/Home.tsx`. As regras de organização ficam em `client/src/lib/qa-organizer.ts`, e os leitores de PDF, planilhas, evidências e OCR ficam em `client/src/lib/`. A janela desktop e a ponte segura do Electron ficam em `desktop/`. O empacotamento do Windows é definido em `electron-builder.yml`.

Antes de aceitar alterações, execute `pnpm check`, `pnpm test`, `pnpm build` e `pnpm desktop:win`. A execução funcional do `.exe` deve ser conferida em uma máquina Windows real. A ferramenta não exige IA, API, backend, banco de dados ou conexão externa para organizar os documentos. Quando a fonte não informar algo, a aplicação registra um GAP e mantém o conteúdo original para auditoria.
