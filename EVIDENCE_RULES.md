# Como o painel usa cada arquivo

Este documento explica o que o painel aproveita de cada tipo de material e o que precisa de revisão humana. A regra é simples: o que está claro na fonte pode ser organizado; o que não está claro continua pendente de confirmação.

| Origem | O que é preservado | O que pode entrar em um card | O que precisa de atenção |
| --- | --- | --- | --- |
| Texto colado | O texto permanece editável no campo de origem. | Frases e regras escritas no próprio texto. | Trechos incompletos ou contraditórios. |
| PDF | Texto por página, títulos claros e observações visuais quando disponíveis. | Trechos com página de origem e elementos visualmente legíveis. | PDFs sem texto pesquisável, tabelas quebradas e páginas com muitas colunas. |
| Imagem de erro | Nome do arquivo e, com login, itens visíveis na captura. | Mensagens, códigos, controles e estados que aparecem de forma legível. | Partes cortadas, borradas ou que dependem de contexto fora da imagem. |
| Log | Conteúdo integral e nome do arquivo. | Mensagens, códigos e ocorrências presentes no log. | Motivo do problema quando ele não está escrito no próprio log. |
| Planilha XLSX | Abas, cabeçalhos, linhas e células vazias. | Valores e textos que aparecem nas células. | Interpretações que não estejam escritas na planilha. |

## Regras práticas

O painel acrescenta cada nova fonte ao texto de trabalho com a identificação da origem. Um arquivo novo não substitui os anteriores. Isso permite revisar de onde veio cada informação antes de copiá-la para um card ou para uma planilha de acompanhamento.

Quando uma tabela de PDF tem várias colunas ou células em mais de uma linha, o painel mantém os fragmentos e a página. Ele não monta uma relação entre células se essa relação não estiver clara na camada textual. Nesse caso, confira a página visualmente.

Um card de bug só deve trazer comportamento, impacto, critério ou cenário que tenha base no material enviado. Se faltar contexto, a saída informa que o ponto precisa de confirmação em vez de propor uma solução técnica.
