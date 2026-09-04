# Erika QA

## Visão Geral

Erika QA é uma ferramenta local para apoiar Analistas de Qualidade na organização de histórias de usuário, estruturação de requisitos, geração de STEPs, identificação de riscos preventivos de performance e consolidação de gaps.

A aplicação preserva a fonte original e trabalha de forma determinística, sem dependência obrigatória de IA, API, backend, banco de dados ou conexão externa.

## Objetivo

O objetivo é transformar texto bruto em material rastreável para QA, sem inventar comportamentos, completar lacunas ou substituir decisões do time.

> O que não está na fonte não vira requisito.

## Funcionalidades

O fluxo oficial é:

`Texto Bruto → Organizar História → Gerar STEPs → Análise Preventiva de Performance → Gaps e Indefinições → Exportar Resultado`

A etapa **Organizar História** identifica, quando presentes, os campos “Como um”, “Eu quero”, “Para que”, critérios de aceitação, regras de negócio, restrições, dependências, fluxos, exceções e pontos de atenção. A etapa **Gerar STEPs** produz pré-condições, passos objetivos e resultados esperados usando somente informações explícitas.

A **Análise Preventiva de Performance** registra riscos observáveis e implícitos, objetivo, forma de teste, ferramenta recomendada, resultado esperado e justificativa. Ela não sugere soluções técnicas. **Gaps e Indefinições** consolida ambiguidades, conflitos, informações ausentes, regras incompletas e critérios insuficientes sem preencher lacunas.

O resultado pode ser exportado localmente em **TXT**, **Markdown** e **Excel compatível com planilhas**. O processamento é exclusivamente textual e local.

## Arquitetura

A interface fica em `client/src/pages/Home.tsx`. As regras determinísticas de organização e geração de STEPs ficam em `client/src/lib/qa-organizer.ts`; a auditoria está em `client/src/lib/qa-audit.ts`; a análise preventiva está em `client/src/lib/qa-performance.ts`; e a exportação está em `client/src/lib/qa-export.ts`.

A aplicação Web é construída com Vite, React e TypeScript. A versão Desktop utiliza Electron com isolamento de contexto, sem integração de credenciais ou armazenamento de secrets. Os dados permanecem no dispositivo por meio do armazenamento local do navegador/aplicativo.

## Instalação

Requisitos: **Node.js 22** e **pnpm**.

```bash
pnpm install --frozen-lockfile --ignore-scripts
```

## Execução Web

```bash
pnpm dev
```

Para validação de produção:

```bash
pnpm check
pnpm test
pnpm build
pnpm start
```

## Execução Desktop

Durante o desenvolvimento:

```bash
pnpm desktop:dev
```

Para gerar o executável portátil do Windows:

```bash
pnpm desktop:win
```

O arquivo é criado em `release/`. A publicação final do executável ocorre pelo workflow do GitHub Actions em ambiente Windows.

## Exportação

Depois de concluir a análise, acesse **Exportar Resultado**. Os arquivos incluem os STEPs, as validações preventivas de performance e os gaps consolidados. A geração acontece no próprio dispositivo.

## Publicação

O workflow de qualidade executa a verificação de tipos, testes e build. O workflow de páginas publica a versão Web, e o workflow de release prepara a versão Desktop para Windows quando uma tag de versão é enviada ao GitHub.

## Roadmap

O foco atual é manter o fluxo textual simples, rastreável e manutenível. Evoluções futuras devem preservar a operação local, a ausência de dependência obrigatória de IA e o princípio de não inventar informações ausentes.
