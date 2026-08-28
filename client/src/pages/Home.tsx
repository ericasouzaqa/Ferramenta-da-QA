import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { extractPdfEvidence, pdfSourceText, type PdfExtraction } from "@/lib/pdf-reader";
import { appendEvidenceBlocks, formatImageEvidence, formatLogEvidence, formatUninspectedImage } from "@/lib/evidence-sources";
import { extractSpreadsheetEvidence } from "@/lib/xlsx-reader";
import { formatScenario, type GeneratedScenario, type OrganizedQaMaterial, organizeQaMaterial } from "@/lib/qa-organizer";

type Stage = "fonte" | "entregas" | "steps" | "gherkin" | "exportacao";

const SOURCE_KEY = "ferramenta-qa-source-v3";
const STAGES: Array<{ id: Stage; label: string }> = [
  { id: "fonte", label: "Fonte" },
  { id: "entregas", label: "Entregas" },
  { id: "steps", label: "Cenários STEP" },
  { id: "gherkin", label: "Gherkin" },
  { id: "exportacao", label: "Exportação" },
];

function savedSource() {
  try {
    return localStorage.getItem(SOURCE_KEY) ?? "";
  } catch {
    return "";
  }
}

function copyText(value: string, label: string) {
  if (!value.trim()) {
    toast.error("Não há conteúdo para copiar.");
    return;
  }
  const fallback = () => {
    const helper = document.createElement("textarea");
    helper.value = value;
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
  };
  const operation = navigator.clipboard?.writeText ? navigator.clipboard.writeText(value).catch(fallback) : Promise.resolve(fallback());
  operation.then(() => toast.success(`${label} copiado.`));
}

function downloadCsv(scenarios: GeneratedScenario[]) {
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const rows = [
    ["STEP", "Título", "Referência", "Pré-condições", "Passos", "Resultado esperado", "Gaps e indefinições", "Status"],
    ...scenarios.map((scenario, index) => [
      `STEP ${index + 1}`,
      scenario.title,
      scenario.reference,
      scenario.preconditions.join("\n"),
      scenario.steps.join("\n"),
      scenario.expectedResult.join("\n"),
      scenario.gaps.join("\n"),
      scenario.status,
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(escape).join(";")).join("\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "ferramenta-da-qa-cenarios.csv";
  link.click();
  URL.revokeObjectURL(url);
  toast.success("CSV baixado.");
}

function countBlocks(value: string) {
  return value.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean).length;
}

function renderList(items: string[], empty = "Não informado no conteúdo de origem.") {
  return items.length ? items.map((item, index) => <span key={`${item}-${index}`}>{item}</span>) : <span>{empty}</span>;
}

function scenarioNumber(scenario: GeneratedScenario, index: number) {
  const explicit = scenario.id.match(/scenario-(\d+)$/)?.[1];
  return explicit ?? String(index + 1);
}

export default function Home() {
  const [source, setSource] = useState(savedSource);
  const [stage, setStage] = useState<Stage>("fonte");
  const [confirmed, setConfirmed] = useState(false);
  const [material, setMaterial] = useState<OrganizedQaMaterial | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(0);
  const [visualEvidence, setVisualEvidence] = useState<Array<{ name: string; source: string; type: "PDF" | "Imagem" }>>([]);
  const [pdfSummary, setPdfSummary] = useState<Pick<PdfExtraction, "pageCount" | "textPages" | "ocrPages" | "emptyPages" | "lowConfidencePages" | "warnings" | "readStatus"> | null>(null);

  useEffect(() => {
    try {
      if (source.trim()) localStorage.setItem(SOURCE_KEY, source);
      else localStorage.removeItem(SOURCE_KEY);
    } catch {
      toast.error("Não foi possível guardar a fonte neste navegador.");
    }
  }, [source]);

  const scenarios = material?.scenarios ?? [];
  const currentDelivery = material?.deliveries[selectedDelivery] ?? material?.deliveries[0];
  const gherkin = scenarios.map((scenario) => scenario.gherkin).filter(Boolean).join("\n\n");
  const gherkinReasons = Array.from(new Set(scenarios.flatMap((scenario) => scenario.gherkin ? [] : scenario.gaps)));
  const stepsText = scenarios.map(formatScenario).join("\n\n");
  const blocks = useMemo(() => countBlocks(source), [source]);
  const pdfReadPartial = pdfSummary?.readStatus === "parcial" || /\[Página \d+ · (?:OCR local|sem conteúdo identificado)\]/.test(source);

  function changeSource(value: string) {
    setSource(value);
    setConfirmed(false);
    setMaterial(null);
    setPdfSummary(null);
    setStage("fonte");
  }

  async function readPdf(file: File) {
    setBusy(true);
    try {
      const extraction = await extractPdfEvidence(file);
      changeSource(appendEvidenceBlocks(source, [`[PDF: ${file.name}]\n${pdfSourceText(extraction)}`]));
      setPdfSummary(extraction);
      setVisualEvidence((current) => [...current, ...extraction.pages.filter((page) => page.imageDataUrl).map((page) => ({ name: `${file.name}, página ${page.page}`, source: page.imageDataUrl, type: "PDF" as const }))]);
      const previewNotice = extraction.previewFailures > 0 ? ` ${extraction.previewFailures} página(s) sem prévia visual; conferir manualmente.` : "";
      const readNotice = extraction.readStatus === "parcial"
        ? `Documento parcialmente identificado: ${extraction.ocrPages.length} página(s) processada(s) por OCR ou com conteúdo ausente. Revise antes de organizar.`
        : `PDF lido localmente: ${extraction.pageCount} página(s). Revise a fonte antes de continuar.`;
      if (extraction.readStatus === "parcial") toast.warning(`${readNotice}${previewNotice}`);
      else toast.success(`${readNotice}${previewNotice}`);
    } catch {
      changeSource(appendEvidenceBlocks(source, [`[PDF: ${file.name}]\n[PDF não identificado]\nA leitura textual não foi concluída. Conferir o arquivo manualmente.`]));
      toast.error("PDF preservado como GAP para conferência manual.");
    } finally {
      setBusy(false);
    }
  }

  async function readXlsx(file: File) {
    setBusy(true);
    try {
      const extraction = await extractSpreadsheetEvidence(file);
      changeSource(appendEvidenceBlocks(source, [extraction.sourceText]));
      toast.success(`XLSX lido localmente: ${extraction.sheetCount} aba(s) e ${extraction.rowCount} linha(s).`);
    } catch {
      toast.error("Não foi possível ler o XLSX. A fonte atual foi preservada.");
    } finally {
      setBusy(false);
    }
  }

  async function readLog(file: File) {
    setBusy(true);
    try {
      changeSource(appendEvidenceBlocks(source, [formatLogEvidence(file.name, await file.text())]));
      toast.success(`Log importado: ${file.name}.`);
    } catch {
      toast.error("Não foi possível ler o log. A fonte atual foi preservada.");
    } finally {
      setBusy(false);
    }
  }

  function addImage(file: File) {
    const block = file.type.startsWith("image/") ? formatUninspectedImage(file.name) : formatImageEvidence(file.name, [], ["Formato de imagem não reconhecido."]);
    changeSource(appendEvidenceBlocks(source, [block]));
    setVisualEvidence((current) => [...current, { name: file.name, source: URL.createObjectURL(file), type: "Imagem" }]);
    toast.info("Imagem preservada como evidência a confirmar.");
  }

  function organize() {
    if (!confirmed) {
      toast.error("Confirme a leitura integral antes de organizar.");
      return;
    }
    if (pdfReadPartial) {
      toast.error("A fonte PDF está parcialmente identificada. Revise as páginas e corrija a fonte antes de organizar.");
      return;
    }
    const organized = organizeQaMaterial(source);
    if (!organized) {
      toast.error("Informe uma fonte antes de organizar.");
      return;
    }
    setMaterial(organized);
    setSelectedDelivery(0);
    setStage("entregas");
    toast.success("Fonte organizada sem acrescentar informações.");
  }

  function clear() {
    visualEvidence.filter((item) => item.source.startsWith("blob:")).forEach((item) => URL.revokeObjectURL(item.source));
    setVisualEvidence([]);
    changeSource("");
    setMaterial(null);
    toast.success("Fonte removida da sessão local.");
  }

  function navigate(next: Stage) {
    if (next === "fonte" || material) setStage(next);
    else toast.info("Organize a fonte antes de acessar esta etapa.");
  }

  return (
    <main className="qa-shell">
      <header className="qa-header">
        <div><p className="eyebrow">Ferramenta da QA</p><h1>Requisitos organizados para teste</h1><p className="subtitle">Preserve a fonte, separe as entregas e prepare cenários objetivos.</p></div>
        <button className="button button-secondary" onClick={clear}>Novo documento</button>
      </header>

      <nav className="stage-nav" aria-label="Etapas da ferramenta">
        {STAGES.map((item, index) => <button key={item.id} className={`stage-button ${stage === item.id ? "is-active" : ""}`} onClick={() => navigate(item.id)}><span>{String(index + 1).padStart(2, "0")}</span>{item.label}</button>)}
      </nav>

      {stage === "fonte" && <section className="workspace"><div className="section-heading"><div><p className="eyebrow">Etapa 01</p><h2>Fonte do documento</h2></div><span className="status-badge">Leitura local</span></div><p className="section-lead">Cole o texto original ou carregue um arquivo. Nada é organizado antes da sua confirmação de leitura.</p><div className="import-row"><label className="button button-primary">Ler PDF<input type="file" accept="application/pdf" hidden disabled={busy} onChange={(event) => event.target.files?.[0] && readPdf(event.target.files[0])} /></label><label className="button button-secondary">Ler XLSX<input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden disabled={busy} onChange={(event) => event.target.files?.[0] && readXlsx(event.target.files[0])} /></label><label className="button button-secondary">Adicionar imagem<input type="file" accept="image/*" hidden onChange={(event) => event.target.files?.[0] && addImage(event.target.files[0])} /></label><label className="button button-secondary">Ler log<input type="file" accept=".log,.txt,text/plain" hidden disabled={busy} onChange={(event) => event.target.files?.[0] && readLog(event.target.files[0])} /></label><button className="button button-quiet" onClick={clear}>Limpar</button></div><textarea aria-label="Texto de origem" className="source-editor" value={source} onChange={(event) => changeSource(event.target.value)} placeholder="Cole aqui o conteúdo original do requisito." />{visualEvidence.length > 0 && <div className="visual-evidence"><div><h3>Evidências visuais preservadas</h3><p>As imagens estão disponíveis para conferência. Nenhuma descrição foi criada automaticamente.</p></div><div className="visual-grid">{visualEvidence.map((item) => <figure key={`${item.name}-${item.source}`}><img src={item.source} alt={item.name} /><figcaption>{item.type}: {item.name}</figcaption></figure>)}</div></div>}<div className="source-meta"><span>{blocks} bloco(s) preservado(s)</span><span>{source.length.toLocaleString("pt-BR")} caracteres</span></div>{pdfSummary && <div className="pdf-summary"><strong>{pdfSummary.readStatus === "concluida" ? "Leitura concluída" : "Documento parcialmente identificado"}</strong><span>{pdfSummary.pageCount} página(s)</span><span>{(pdfSummary.textPages ?? []).length} com texto</span><span>{(pdfSummary.ocrPages ?? []).length} com OCR local</span><span>{(pdfSummary.emptyPages ?? []).length} sem conteúdo</span>{(pdfSummary.lowConfidencePages ?? []).length > 0 && <span>Baixa confiança: {(pdfSummary.lowConfidencePages ?? []).join(", ")}</span>}{(pdfSummary.warnings ?? []).length > 0 && <p>{(pdfSummary.warnings ?? []).length} alerta(s) para revisão manual.</p>}</div>}<div className="confirmation-box"><label><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> Revisei a leitura integral do conteúdo apresentado.</label><button className="button button-primary" disabled={!source.trim() || !confirmed || busy || pdfReadPartial} onClick={organize}>Organizar entregas</button></div></section>}

      {stage === "entregas" && material && <section className="workspace"><div className="section-heading"><div><p className="eyebrow">Etapa 02</p><h2>Organização por entrega</h2></div><span className="status-badge">{material.deliveries.length} entrega(s)</span></div><p className="section-lead">Cada bloco corresponde a uma parte reconhecida na fonte. Conteúdo não reconhecido permanece disponível para revisão.</p><div className="delivery-list">{material.deliveries.map((delivery, index) => <button key={delivery.id} className={`delivery-card ${selectedDelivery === index ? "is-active" : ""}`} onClick={() => setSelectedDelivery(index)}><span>Entrega {index + 1}</span><strong>{delivery.title}</strong><small>{delivery.scenarios.length} cenário(s)</small></button>)}</div><div className="source-preview"><h3>Material preservado da entrega</h3><pre>{currentDelivery?.sourceText}</pre></div><div className="action-row"><button className="button button-secondary" onClick={() => setStage("fonte")}>Voltar à fonte</button><button className="button button-primary" onClick={() => setStage("steps")}>Ver cenários STEP</button></div></section>}

      {stage === "steps" && material && <section className="workspace"><div className="section-heading"><div><p className="eyebrow">Etapa 03</p><h2>Cenários STEP</h2></div><span className="status-badge">Até 10 por entrega</span></div><p className="section-lead">Os cenários exibem somente o que foi reconhecido na fonte. Ausências são registradas como gaps.</p><div className="scenario-stack">{scenarios.length ? scenarios.map((scenario, index) => <article className="scenario-card" key={scenario.id}><div className="scenario-top"><span>STEP {scenarioNumber(scenario, index)}</span><span className={scenario.status === "pronto" ? "status-ok" : "status-gap"}>{scenario.status === "pronto" ? "Fonte completa" : "Há gaps"}</span></div><h3>{scenario.title}</h3><p className="reference">Referência: {scenario.reference}</p><div className="scenario-content"><h4>Pré-condições</h4><p>{renderList(scenario.preconditions)}</p><h4>Passos</h4><ol>{scenario.steps.length ? scenario.steps.map((item, itemIndex) => <li key={itemIndex}>{item}</li>) : <li>Não informado no conteúdo de origem.</li>}</ol><h4>Resultado esperado</h4><p>{renderList(scenario.expectedResult)}</p>{scenario.gaps.length > 0 && <><h4>Gaps e indefinições</h4><ul>{scenario.gaps.map((gap, gapIndex) => <li key={gapIndex}>{gap}</li>)}</ul></>}</div><button className="button button-secondary" onClick={() => copyText(formatScenario(scenario), "STEP")}>Copiar STEP</button></article>) : <div className="empty-state">Nenhum cenário estruturado foi reconhecido. A fonte original continua preservada na primeira etapa.</div>}</div><div className="action-row"><button className="button button-secondary" onClick={() => setStage("entregas")}>Voltar às entregas</button><button className="button button-primary" disabled={!gherkin} onClick={() => setStage("gherkin")}>Ver Gherkin</button></div></section>}

      {stage === "gherkin" && material && <section className="workspace"><div className="section-heading"><div><p className="eyebrow">Etapa 04</p><h2>Gherkin</h2></div><span className="status-badge">Separado dos STEPs</span></div><p className="section-lead">O Gherkin só é criado quando há título, pré-condições, passos e resultado esperado explícitos.</p>{gherkin ? <><pre className="code-panel">{gherkin}</pre><button className="button button-primary" onClick={() => copyText(gherkin, "Gherkin")}>Copiar Gherkin</button></> : <div className="empty-state"><p>Nenhum Gherkin foi formado. Faltam informações explícitas na fonte.</p>{gherkinReasons.length > 0 && <><strong>Motivos registrados</strong><ul>{gherkinReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></>}</div>}<div className="action-row"><button className="button button-secondary" onClick={() => setStage("steps")}>Voltar aos STEPs</button><button className="button button-primary" onClick={() => setStage("exportacao")}>Ir para exportação</button></div></section>}

      {stage === "exportacao" && material && <section className="workspace"><div className="section-heading"><div><p className="eyebrow">Etapa 05</p><h2>Exportação e cópia</h2></div><span className="status-badge">Sem integração externa</span></div><p className="section-lead">Copie texto formatado para o YouTrack ou baixe uma relação em CSV. A ferramenta não acessa essas plataformas.</p><div className="export-grid"><button className="export-card" onClick={() => copyText(stepsText, "Cenários STEP")}><strong>Copiar cenários STEP</strong><span>Texto formatado para colar no YouTrack.</span></button><button className="export-card" onClick={() => copyText(gherkin, "Gherkin")}><strong>Copiar Gherkin</strong><span>Somente os cenários formados com dados explícitos.</span></button><button className="export-card" onClick={() => downloadCsv(scenarios)}><strong>Baixar CSV</strong><span>Uma linha por cenário reconhecido.</span></button></div><div className="action-row"><button className="button button-secondary" onClick={() => setStage("gherkin")}>Voltar ao Gherkin</button><button className="button button-primary" onClick={() => setStage("fonte")}>Carregar outra fonte</button></div></section>}

      <footer className="qa-footer">O que não está na fonte não vira requisito. O conteúdo permanece no dispositivo.</footer>
    </main>
  );
}
