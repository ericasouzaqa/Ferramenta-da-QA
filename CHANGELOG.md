# Changelog

## [1.6.1] — 2026-09-04

### Corrigido

- Ajustada a espera dos testes de interface para evitar falhas ocasionais em ambientes Windows mais lentos.

## [1.6.0] — 2026-09-04

### Adicionado e melhorado

- Geração de STEPs organizada por objetivo de validação, com histórias e requisitos mais coerentes.
- Ajustes na rastreabilidade, na auditoria e na identificação de informações incompletas.
- Análise preventiva de performance e exportação dos resultados em TXT, Markdown e Excel.
- Funcionamento offline validado e nova identidade visual da aplicação.
- README simplificado para explicar a ferramenta em linguagem direta.

## [1.5.0] — 2026-08-30

### Melhorado

- Organização derivada por história ou requisito encontrado no documento, reconhecendo História, User Story, RF, Requisito, PBI, Item e Entrega quando explicitamente identificados.
- Vínculo de cada STEP à história/requisito correto, com origem, página quando disponível e trecho preservado.
- Saída copiada simplificada para revisão manual, com passos, resultado esperado, referência e GAPS, sem pré-condições ou Gherkin.
- Interface mantida no fluxo Fonte → Entregas → Cenários STEP, com cópia individual e cópia de todos os STEPs.
- Apresentação de histórias/requisitos identificados e estilos para evitar cortes e perda visual de conteúdo longo.

### Preservado

- Fonte original e `sourceText`, PDF/OCR, XLSX, texto manual, auditoria, GAPS, rastreabilidade, Web, Electron/Desktop, dependências e funcionamento sem IA obrigatória.
- Nenhuma informação é completada por suposição; ausência de evidência permanece como GAP.


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

[1.6.1]: https://github.com/ericasouzaqa/Ferramenta-da-QA/releases/tag/v1.6.1
[1.6.0]: https://github.com/ericasouzaqa/Ferramenta-da-QA/releases/tag/v1.6.0
[1.5.0]: https://github.com/ericasouzaqa/Ferramenta-da-QA/releases/tag/v1.5.0
[1.4.0]: https://github.com/ericasouzaqa/Ferramenta-da-QA/releases/tag/v1.4.0
[1.3.0]: https://github.com/ericasouzaqa/Ferramenta-da-QA/releases/tag/v1.3.0
[1.2.0]: https://github.com/ericasouzaqa/Ferramenta-da-QA/releases/tag/v1.2.0
