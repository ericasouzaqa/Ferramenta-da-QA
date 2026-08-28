# Regras de fidelidade — Sinal QA

## Princípio de origem

Todo conteúdo apresentado como fato deve estar presente no texto digitado ou no texto extraído do PDF. O sistema pode normalizar espaçamento, separar tópicos, aplicar títulos fixos e agrupar trechos semelhantes, mas não pode completar requisito, fluxo, resultado, impacto, regra de negócio, plataforma, ambiente ou evidência que não esteja na origem.

## Saída para card de bug

Cada problema explicitamente identificado gera **um card separado**. O gerador não mistura problemas, não apresenta solução técnica e não cria regra de negócio. A saída completa contém, nesta ordem, **Descrição**, **Itens de correção**, **Critérios de aceite** e **Cenários de teste**. Não há introdução, conclusão ou texto promocional.

A descrição registra comportamento atual, comportamento esperado e impacto, quando houver fonte. Os itens de correção dizem somente o que precisa ser ajustado a partir do comportamento esperado informado. Critérios de aceite contêm apenas comportamento esperado verificável, sem passos ou repetição de cenários. Cenários são sempre checklist e contemplam fluxo principal, fluxo alternativo, regressão, validações, persistência, integração, mensagens, UI, permissões, segurança, performance e dados **somente quando o texto trouxer evidência aplicável**.

Quando o usuário escolher “Apenas critérios”, “Apenas cenários” ou “Revisar lacunas”, o painel deve retornar somente o escopo solicitado. A revisão aponta informações ausentes e melhorias necessárias sem reescrever material que já esteja suficiente. Quando uma seção não tiver fonte explícita, ela deve exibir **“Não informado no conteúdo de origem.”**

O sistema só cria títulos de seção, numeração e frases de instrução fixas, como “Validar o comportamento descrito”. Essas frases não devem ser apresentadas como fatos do produto. Cada bloco gerado deve manter a frase de origem visível ou vinculada a ela.

## Leitura de PDF

O leitor extrai apenas a camada de texto pesquisável do PDF, na ordem das páginas, e identifica cada trecho com o número da página. Documentos digitalizados sem camada de texto não devem gerar resumo automático, OCR inventado ou cenários supostos. Nesse caso, a interface deve pedir uma versão pesquisável ou texto colado manualmente.

## Cenários de teste

Os cenários são roteiros de verificação derivados de frases explícitas da origem. Eles não devem introduzir dados de entrada, pré-condições, integrações, resultados ou critérios não fornecidos. Quando uma alteração citar ou evidenciar dependência de funcionalidade existente, o painel inclui um cenário de regressão vinculado ao trecho correspondente. Onde a origem for insuficiente, o cenário deve indicar que o dado precisa ser confirmado antes da execução.

## Edição e transparência

Todo texto de entrada, extração e saída deve permanecer editável. O usuário pode corrigir a leitura, completar um ponto ausente e regenerar o material. Copiar, limpar, importar PDF, usar o texto extraído, adicionar caso, editar célula, filtrar, exportar e excluir devem responder sem bloqueio e com retorno visual objetivo.
