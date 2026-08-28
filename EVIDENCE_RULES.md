# Como cada fonte é preservada

A aplicação mantém o material recebido no dispositivo e exibe o que foi incorporado antes da organização. O que não pode ser reconhecido com segurança permanece como conteúdo de origem ou gap para conferência.

| Origem | Preservação local | Limitação conhecida |
| --- | --- | --- |
| Texto colado | O texto permanece editável no campo de origem. | Estruturas sem marcadores não são interpretadas semanticamente. |
| PDF | Texto por página e prévias locais das páginas quando disponíveis. | PDF sem camada textual não gera OCR. Tabelas complexas devem ser conferidas visualmente. |
| Imagem | Arquivo visual preservado para conferência e nome incorporado à fonte. | Nenhum texto ou estado é descrito automaticamente. |
| Log | Nome do arquivo e conteúdo textual incorporados à fonte. | O motivo de um problema não é deduzido quando não está escrito. |
| Planilha XLSX | Abas, cabeçalhos, linhas e células vazias lidos localmente. | Relações ou regras não escritas nas células não são inferidas. |

## Regras práticas

Uma nova fonte é acrescentada ao texto de trabalho e não substitui as anteriores. Isso permite conferir a origem antes de organizar ou copiar um cenário. O texto de origem continua editável para correções manuais e uma nova organização pode ser executada depois da confirmação de leitura.

Quando uma estrutura não é reconhecida, a aplicação preserva o bloco e informa o gap correspondente. Não cria descrição, pré-condição, passo, resultado, referência ou regra ausente. A cópia para o YouTrack é somente texto formatado para colagem manual; não existe acesso automático à plataforma.
