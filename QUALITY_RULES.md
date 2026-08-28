# Regras de fidelidade

## Princípio de origem

Todo conteúdo apresentado como fato deve estar presente no texto digitado ou no texto extraído localmente. O sistema pode normalizar espaçamento, separar blocos e aplicar os títulos fixos do formato STEP. Não pode completar requisito, fluxo, resultado, impacto, regra de negócio, plataforma, ambiente ou evidência que não esteja na origem.

## Fluxo da aplicação

A aplicação segue cinco etapas: **Fonte**, **Organização por entrega**, **Cenários STEP**, **Gherkin** e **Exportação**. A fonte original permanece visível e editável. As entregas são separadas somente quando há marcadores explícitos `STEP`. Um bloco que não possa ser interpretado continua preservado, sem ser convertido em cenário inventado.

## Cenários STEP

Cada cenário usa os títulos fixos **Pré-condições**, **Passos**, **Resultado esperado** e **Gaps e indefinições**. O conteúdo dessas seções vem somente de blocos explicitamente identificados na fonte. O formato limita a saída a oito passos por cenário e registra como gap quando a origem tiver mais passos. Cada entrega pode apresentar no máximo dez cenários reconhecidos.

A referência de origem é extraída quando há um marcador explícito de Item, PBA ou Card. Se não houver referência reconhecível, a saída informa **“Referência não informada nos artefatos.”**. Nenhuma referência é criada pelo sistema.

## Gherkin

O Gherkin é apresentado em etapa separada e somente é formado quando o cenário possui título, pré-condições, passos e resultado esperado explicitamente reconhecidos. Se faltar qualquer um desses elementos, a etapa informa a ausência e não cria um roteiro incompleto.

## Leitura local

O leitor de PDF extrai a camada textual pesquisável na ordem das páginas e mantém prévias locais para conferência. PDF escaneado sem camada textual não gera OCR, resumo ou cenário suposto. XLSX mantém abas, cabeçalhos, linhas e células vazias conforme a leitura disponível. Imagens são preservadas para conferência sem descrição automática. Logs são incorporados com nome e conteúdo.

## Transparência

O usuário pode corrigir o texto de origem e reorganizar o material. A aplicação não acessa YouTrack nem outros serviços. Copiar para o YouTrack significa copiar texto formatado para colagem manual. Exportar CSV significa gerar um arquivo local com os cenários reconhecidos.
