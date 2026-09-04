# Erika QA

## Sobre a ferramenta

O Erika QA ajuda profissionais de Qualidade a transformar uma descrição de sistema em um material mais organizado para testes.

Com ele, você pode:

- organizar histórias de usuário;
- criar passos para os testes;
- identificar informações que estão faltando ou pouco claras;
- levantar possíveis problemas de velocidade;
- salvar o resultado para consultar ou compartilhar.

A ferramenta funciona no próprio computador e não exige cadastro, servidor ou conexão com a internet para realizar essas atividades.

## Como funciona

Você informa o texto da história ou do requisito, e a ferramenta organiza o conteúdo em etapas mais fáceis de entender. Depois, é possível revisar as informações, conferir os pontos de atenção e exportar o resultado.

A ferramenta usa apenas as informações fornecidas. Ela não inventa dados que não estejam no texto original.

## Exportação

O resultado pode ser salvo nos formatos:

- TXT;
- Markdown;
- Excel compatível com planilhas.

## Instalação

Para instalar e executar o projeto, é necessário ter o [Node.js 22](https://nodejs.org/) e o [pnpm](https://pnpm.io/) instalados.

```bash
pnpm install --frozen-lockfile --ignore-scripts
```

## Executar no navegador

```bash
pnpm dev
```

Depois, abra no navegador o endereço mostrado no terminal.

## Executar como aplicativo para computador

Durante o desenvolvimento:

```bash
pnpm desktop:dev
```

Para gerar a versão para Windows:

```bash
pnpm desktop:win
```

O arquivo gerado ficará na pasta `release/`.

## Testes do projeto

Para verificar se o projeto está funcionando corretamente, use:

```bash
pnpm check
pnpm test
pnpm build
```

## Publicação

A publicação da versão Web e a criação da versão para Windows são realizadas pelos workflows configurados no GitHub Actions.

## Licença

Consulte os arquivos deste repositório para mais informações sobre o uso do projeto.
