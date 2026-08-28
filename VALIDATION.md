# Registro de validação

## Inspeção visual

Em 22 de agosto de 2026, o painel foi inspecionado nas viewports de **1280 × 720** e **375 × 812**. A revisão confirmou que a área de triagem, os comandos de importação, a fonte editável, os cartões de saída, os cenários e a planilha permanecem visíveis e utilizáveis nas duas larguras.

Na versão móvel, a navegação lateral é substituída pelo comando de menu no cabeçalho e os painéis são reorganizados em uma coluna, sem ocultar as ações de importar PDF, imagem, log, limpar ou organizar a fonte.

## Cobertura funcional confirmada

Os **20 testes de interface** cobrem a importação em sequência de texto, log, PDF, XLSX e imagem, inclusive a planilha de referência. Eles também verificam os limites seguros de imagem, os estados de erro, a limpeza da fonte, os cards, a cópia de cenários, a aba de aplicativo, a planilha, a exportação CSV, a navegação móvel e o fluxo de PDF com login. Quando uma etapa falha, o conteúdo anterior continua disponível.

Na validação final, a suíte completa executou **64 testes em 10 arquivos**. A checagem de tipos e o build de produção concluíram sem erros. A auditoria das dependências de produção não encontrou vulnerabilidades conhecidas. O leitor XLSX foi verificado com a planilha fornecida, mantendo as 3 abas e as 22 linhas de dados observadas. A análise visual também tem limites de tamanho, quantidade de itens e páginas por envio.

O gerador de bugs foi validado com um relato de três linhas, dois defeitos separados por parágrafo e um caso com impacto informado. A saída mantém as quatro seções obrigatórias e produz cenários em checklist, incluindo apenas os tipos que encontram base no texto.

## Segurança e pacote Windows

O pacote portátil Windows foi gerado com o painel estático, os arquivos da janela desktop e o ícone da Erica QA. A configuração de empacotamento inclui somente `dist/public` e `desktop`; ela não inclui `node_modules`, ferramentas de build, chaves ou arquivos de ambiente. O arquivo portátil `Sinal-QA-1.1.0-portable.exe` foi identificado como executável PE para Windows. Sua soma SHA-256 é `fb34ebc9a268dac93caad32d24a2de15878e32897a3f96e2ad1fc8e2d7717f75`.

A auditoria completa, que também examina ferramentas de desenvolvimento, ainda aponta avisos transitivos em componentes usados para testes e empacotamento, como Vitest, pnpm e dependências de build. Esses pacotes não fazem parte do artefato portátil configurado. A auditoria de produção, que representa a aplicação distribuída, não encontrou vulnerabilidades conhecidas.

Este registro não substitui a revisão humana das fontes: conteúdos ambíguos, ilegíveis ou não fornecidos continuam marcados para confirmação.

## Identidade Erica QA: verificação visual

As artes fornecidas foram incorporadas como ativos estáticos do painel. Em desktop, a navegação recebe o fundo cósmico, a assinatura usa o retrato da Erica QA e a área inicial usa a arte de capa sem encobrir os comandos de triagem. Em mobile, os controles, a área de texto, os cartões, a planilha e as métricas continuam apresentados em uma coluna, com os botões de ação visíveis e legíveis.

Os tons de violeta profundo, magenta e ciano foram aplicados como acentos de marca, preservando superfícies claras para leitura de textos longos e estados de confirmação distintos.

## Revisão de linguagem

| Área | Ajuste realizado |
| --- | --- |
| Tela principal | Os textos de abertura, fonte, cards e cenários foram reescritos com instruções mais diretas. |
| Cenários | O separador por traço longo foi substituído por dois pontos nos títulos visíveis. |
| README | O guia passou a explicar instalação, primeiro uso, tipos de arquivo, avisos e problemas comuns para quem está começando. |
| Regras de arquivos | `EVIDENCE_RULES.md` passou a usar exemplos simples de preservação e revisão de cada tipo de fonte. |

Termos funcionais como **fornecido**, **organizado** e **a confirmar** foram mantidos porque indicam a situação do conteúdo e ajudam a revisão manual.

| Grupo revisado | Resultado da leitura final |
| --- | --- |
| Cabeçalho e navegação | Mantidos curtos e operacionais: projeto, triagem, cenários, planilha, exportação e novo caso. |
| Área de fonte | Ajustada para orientar o envio de requisitos e arquivos, sem prometer resultado automático. |
| Estados vazios e avisos | Mantidos com instruções práticas sobre o que falta, como login, conteúdo ausente ou confirmação visual. |
| Cards, cenários e planilha | Mantidos com verbos de ação claros: revisar, copiar, adicionar, editar, filtrar e exportar. |
| Aba de aplicativo | Mantida como orientação de configuração e testes, sempre explicando por que ela apareceu. |
| Mensagens de erro | Mantidas diretas e orientadas à preservação do texto já enviado. |
| Documentação principal | README, regras de arquivos e registro de validação foram lidos do início ao fim após os ajustes. |

A verificação final também conferiu que os textos visíveis e a documentação principal não usam traço longo como separador editorial. Comentários internos e expressões regulares não fazem parte da tela ou do material de uso.
