# Documentação final

## Princípio permanente

> É preferível preservar uma lacuna explícita do que gerar uma informação incorreta.

A Ferramenta da QA é uma aplicação local para preservar requisitos e organizar cenários funcionais de QA com base no documento de origem. O fluxo do produto é exclusivamente:

**Fonte → Organização por entrega → Cenários STEP → Gherkin → Exportação**

O processamento é determinístico. A aplicação reconhece estruturas explícitas, mantém o conteúdo original editável e registra como GAP qualquer informação ausente ou não identificada. Ela não usa serviços de inteligência artificial, não acessa o YouTrack e não depende de conta ou sessão externa.

## Como executar

### Navegador local

Instale Node.js 22 e pnpm. Na raiz do projeto, execute:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm dev
```

Abra o endereço local exibido pelo Vite. Para gerar os arquivos web estáticos, execute:

```bash
pnpm build
```

O resultado ficará em `dist/public`. O workflow `.github/workflows/deploy-pages.yml` publica esse diretório no GitHub Pages quando há alteração na branch `main`. A URL oficial é <https://ericasouzaqa.github.io/Ferramenta-da-QA/>.

### Aplicativo desktop

Para abrir o Electron durante o desenvolvimento:

```bash
pnpm desktop:dev
```

Para gerar o executável portátil Windows:

```bash
pnpm desktop:win
```

O arquivo gerado fica em `release/Ferramenta-da-QA-1.1.0-portable.exe`. A execução nativa deve ser conferida em uma máquina Windows real antes de distribuir o arquivo.

## Fluxo de uso

Na etapa **Fonte**, cole o requisito ou use os leitores locais. Revise o conteúdo incorporado e marque a confirmação de leitura integral. A etapa de organização só é liberada depois dessa confirmação.

Na etapa **Organização por entrega**, confira os blocos separados. A separação é feita por marcadores `STEP`, títulos explícitos ou referências explícitas repetidas. O material original de cada entrega permanece visível para comparação.

Na etapa **Cenários STEP**, confira a referência, as pré-condições, os passos, o resultado esperado e os GAPs. Cada cenário possui no máximo oito passos. Quando uma funcionalidade tem mais de oito passos explícitos, o material é dividido em STEPs complementares.

Na etapa **Gherkin**, o cenário só aparece quando existem título, pré-condições, passos e resultado esperado reconhecidos explicitamente. Nenhuma parte faltante é completada automaticamente.

Na etapa **Exportação**, copie o texto STEP ou Gherkin para colagem manual no YouTrack ou baixe o CSV local. A exportação não acessa a plataforma e não altera os textos revisados.

## Formatos suportados

| Formato | O que funciona | O que exige revisão humana |
| --- | --- | --- |
| Texto colado | Preservação e edição do conteúdo no navegador. | Estruturas sem marcadores podem não formar cenários. |
| PDF textual | Leitura local da camada de texto, por página e na ordem reconstruída. | Conferir quebras, colunas e relações entre blocos. |
| PDF com tabelas | Preservação de tabulações e fragmentos da camada textual. | Confirmar visualmente a relação entre colunas e linhas complexas. |
| PDF com imagens | Pré-visualização local das páginas e preservação do marcador de origem. | O conteúdo visual não é descrito automaticamente. |
| PDF escaneado | Página e indicação de ausência de camada textual são preservadas. | Não há OCR. O conteúdo deve ser conferido manualmente ou fornecido em texto. |
| Imagem anexada | Arquivo visual fica disponível na sessão para conferência. | Nenhum requisito, mensagem ou estado é extraído automaticamente. |
| XLSX | Abas, cabeçalhos, linhas e células disponíveis são lidos localmente. | Fórmulas, estilos e relações espaciais complexas devem ser conferidos. |
| TXT e log | Nome do arquivo e conteúdo textual são incorporados à fonte. | A causa do problema não é deduzida quando não está escrita. |

## Como validar novos documentos

Comece com uma cópia do documento original e não o edite antes da primeira leitura. Importe ou cole o conteúdo na etapa **Fonte**, confira a quantidade de blocos e revise o texto incorporado. Para PDF, confira as páginas visualmente. Para imagem, verifique a prévia local. Para XLSX, confira as abas e os cabeçalhos.

Marque a confirmação de leitura somente depois da conferência. Na etapa de entregas, compare cada bloco com o original. Se uma divisão não estiver explicitamente sustentada por `STEP`, título ou referência, ela não deve ser presumida.

Nos cenários, confirme que cada pré-condição, passo e resultado pode ser localizado no documento. Confirme também a referência de Item, PBI, PBA ou Card. Um GAP é comportamento correto quando a informação não existe ou não foi reconhecida.

No Gherkin, confirme que nenhum `Dado`, `Quando`, `Então` ou título foi acrescentado além dos elementos da fonte. Na exportação, compare o texto copiado ou o CSV com o cenário revisado antes de colá-lo no YouTrack.

Para uma validação mínima, use os seguintes conjuntos:

| Caso | Resultado esperado |
| --- | --- |
| Documento com STEP completo | Uma entrega, cenário completo e Gherkin disponível. |
| Documento sem marcadores | Conteúdo preservado e nenhum cenário inventado. |
| Múltiplas funcionalidades | Entregas separadas somente por sinais explícitos. |
| Mais de oito passos | STEPs complementares, sem perda silenciosa de passos. |
| Documento com tabela | Células preservadas e relação visual conferida manualmente. |
| Documento com imagem | Imagem disponível para conferência e sem descrição automática. |
| Documento desformatado | Bloco original preservado e GAP quando não houver estrutura segura. |

## Limitações conhecidas

A aplicação não realiza compreensão semântica de texto arbitrariamente desformatado. Essa limitação é intencional: sem evidência estrutural explícita, o sistema preserva o material e registra o GAP em vez de inventar uma interpretação.

PDF escaneado não recebe OCR. Imagens e prévias de PDF são preservadas localmente durante a sessão, mas as URLs temporárias não são persistidas entre sessões. O texto incorporado pode ser salvo no armazenamento local do navegador.

A hospedagem web oficial é o GitHub Pages. O build usa automaticamente o subcaminho `/Ferramenta-da-QA/` no workflow e os assets do site são resolvidos nesse caminho. O executável portátil foi empacotado para Windows, porém a execução nativa precisa ser verificada em Windows real.

A cópia para o YouTrack é manual. Não há autenticação, integração, sincronização ou envio automático para essa plataforma.

## Manutenção futura

Antes de modificar o produto, preserve o fluxo das cinco etapas e confirme que a mudança atende ao objetivo documental. Não reintroduza dashboard, cards de bug, recomendações, roteamento, temas ou componentes genéricos sem uma necessidade comprovada do fluxo principal.

As regras de organização ficam em `client/src/lib/qa-organizer.ts`. Os leitores locais ficam em `client/src/lib/pdf-reader.ts`, `client/src/lib/xlsx-reader.ts` e `client/src/lib/evidence-sources.ts`. A composição da interface fica em `client/src/pages/Home.tsx` e os estilos em `client/src/index.css`.

Toda alteração deve manter o princípio de não inferência. Se uma nova regra não puder ser comprovada pelo documento, ela deve ser tratada como GAP. Não use preenchimentos padrão para criar título, pré-condição, passo, resultado, referência ou mensagem.

Antes de aceitar uma alteração, execute:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm test
pnpm build
pnpm audit --prod --audit-level high
pnpm desktop:win
```

Também execute uma revisão textual para verificar chamadas de rede, fontes remotas, referências antigas e traço longo em interface e documentação. Valide pelo menos um documento estruturado, um documento sem marcadores, um documento com múltiplas funcionalidades, uma tabela, uma imagem e um documento desformatado. Não considere a mudança concluída apenas porque o TypeScript e os testes passaram.
