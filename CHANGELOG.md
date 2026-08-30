# Changelog

## [1.4.0] — 2026-08-30

### Adicionado

- Módulo único de Auditoria da Qualidade da Análise integrado à etapa de Cenários STEP.
- Classificação determinística da qualidade do requisito como alta, média ou baixa, sempre acompanhada dos motivos.
- Consolidação de qualidade dos STEPs, cobertura documental, GAPS, rastreabilidade, pontos de atenção e resumo explicável.
- Indicadores de cobertura limitada ao documento analisado, sem afirmar cobertura do sistema real.
- Testes automatizados para indicadores, classificação geral, GAPS deduplicados, rastreabilidade e resumo.

### Preservado

- Fonte original e `sourceText`, processamento local e funcionamento sem IA obrigatória.
- PDF, OCR, XLSX, texto manual, exportações, Web, Electron/Desktop, CI/CD e GitHub Pages.
- Arquitetura, dependências e contratos funcionais existentes.

## [1.3.0] — 2026-08-29

### Adicionado

- Classificação informativa dos cenários como `completo`, `parcial` ou `inconsistente`.
- Categorização de GAPS em funcional, critério, dados, fluxo ou técnico.
- Rastreabilidade por funcionalidade, pré-condições, dados, passos, resultado esperado e GAPS.
- Extração opcional de dados somente quando identificados explicitamente na fonte.
- Testes adicionais para qualidade, GAPS, dados e rastreabilidade.

### Melhorado

- A validação literal passou a apresentar correspondência por campo, mantendo a fonte original intacta.
- Conflitos explícitos permanecem gerados para revisão, sem bloquear a geração nem inventar uma solução.
- A documentação passou a explicar as classificações, categorias, limitações e o funcionamento sem IA obrigatória.

### Preservado

- Processamento local de texto, PDF, OCR, XLSX, imagens e logs.
- Aplicação Web, Electron/Desktop, exportações, CI/CD e GitHub Pages.
- Mensagens, valores, campos, status, termos técnicos e regras presentes nos artefatos.

## [1.2.0] — 2026-08-29

### Adicionado

- Estrutura local auditável para história de usuário, critérios de aceitação, regras de negócio, restrições técnicas, fluxos, exceções, elementos técnicos e gaps.
- Validação local de rastreabilidade entre título, pré-condições, passos, resultados esperados e fonte original.
- Decomposição conservadora de STEPs para fluxos e exceções explicitamente identificados nos artefatos.
- Testes automatizados adicionais para estrutura de requisitos, rastreabilidade e separação semântica.

### Alterado

- Cabeçalho exportado dos cenários ajustado para `STEP X - Nome da funcionalidade`.
- Limite de dez cenários aplicado individualmente por entrega.
- Etapa de Entregas passou a exibir a estrutura derivada do requisito para conferência.

### Preservado

- Processamento local e funcionamento sem dependência obrigatória de IA, internet ou serviço externo.
- Entrada manual, PDF, OCR, XLSX, imagens, logs, exportações, aplicação Web e Electron/Desktop.
- Fonte original, termos técnicos, mensagens, valores, status e gaps sem preenchimento presumido.

[1.4.0]: https://github.com/ericasouzaqa/Ferramenta-da-QA/releases/tag/v1.4.0
[1.3.0]: https://github.com/ericasouzaqa/Ferramenta-da-QA/releases/tag/v1.3.0
[1.2.0]: https://github.com/ericasouzaqa/Ferramenta-da-QA/releases/tag/v1.2.0
