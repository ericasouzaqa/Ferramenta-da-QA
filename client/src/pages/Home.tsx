import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatScenario, type GeneratedScenario, type OrganizedQaMaterial, organizeQaMaterial } from "@/lib/qa-organizer";
import { analyzePerformance } from "@/lib/qa-performance";
import { buildExportBundle, downloadExport, formatExportExcel, formatExportMarkdown, formatExportText } from "@/lib/qa-export";

type Stage = "fonte" | "entregas" | "steps" | "performance" | "gaps" | "export";

const SOURCE_KEY = "ferramenta-qa-source-v3";
const STAGES: Array<{ id: Stage; label: string }> = [
  { id: "fonte", label: "Texto Bruto" },
  { id: "entregas", label: "Organizar História" },
  { id: "steps", label: "Gerar STEPs" },
  { id: "performance", label: "Performance" },
  { id: "gaps", label: "Gaps" },
  { id: "export", label: "Exportar" },
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

function renderBulletList(items: string[], empty = "Não informado no conteúdo de origem.") {
  if (!items.length) return <p>{empty}</p>;
  return <ul className="structured-list">{items.map((item, index) => {
    const nested = item.startsWith("  - ");
    return <li className={nested ? "is-nested" : undefined} key={`${item}-${index}`}>{nested ? item.slice(4) : item}</li>;
  })}</ul>;
}

export default function Home() {
  const [source, setSource] = useState(savedSource);
  const [stage, setStage] = useState<Stage>("fonte");
  const [confirmed, setConfirmed] = useState(false);
  const [material, setMaterial] = useState<OrganizedQaMaterial | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState(0);

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
  const performanceValidations = useMemo(() => material ? analyzePerformance(material) : [], [material]);
  const exportBundle = useMemo(() => material ? buildExportBundle(material, performanceValidations) : null, [material, performanceValidations]);
  const stepsText = [
    scenarios.map(formatScenario).join("\n\n---\n\n"),
    exportBundle?.gaps.length
      ? `Gaps e indefinições\n\n${exportBundle.gaps.map((gap) => `- ${gap}`).join("\n")}`
      : "",
  ].filter(Boolean).join("\n\n---\n\n");
  const blocks = useMemo(() => countBlocks(source), [source]);

  function changeSource(value: string) {
    setSource(value);
    setConfirmed(false);
    setMaterial(null);
    setStage("fonte");
  }

  function organize() {
    if (!confirmed) {
      toast.error("Confirme a leitura integral antes de organizar.");
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
    toast.success("História organizada com base no conteúdo fornecido.");
  }

  function clear() {
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

      {stage === "fonte" && <section className="workspace"><div className="section-heading"><div><p className="eyebrow">Etapa 01</p><h2>Texto bruto</h2></div><span className="status-badge">Leitura local</span></div><p className="section-lead">Cole o texto bruto do requisito. Nada é organizado antes da sua confirmação de leitura.</p><div className="import-row"><button className="button button-quiet" onClick={clear}>Limpar texto</button></div><textarea aria-label="Texto de origem" className="source-editor" value={source} onChange={(event) => changeSource(event.target.value)} placeholder="Cole aqui o conteúdo original do requisito." /><div className="source-meta"><span>{blocks} bloco(s) preservado(s)</span><span>{source.length.toLocaleString("pt-BR")} caracteres</span></div><div className="confirmation-box"><label><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> Revisei a leitura integral do conteúdo apresentado.</label><button className="button button-primary" disabled={!source.trim() || !confirmed} onClick={organize}>Organizar História</button></div></section>}

      {stage === "entregas" && material && <section className="workspace"><div className="section-heading"><div><p className="eyebrow">Etapa 02</p><h2>Organizar História</h2></div><span className="status-badge">{material.deliveries.length} entrega(s)</span></div><p className="section-lead">A história abaixo foi organizada exclusivamente a partir do conteúdo fornecido.</p><div className="delivery-list">{material.deliveries.map((delivery, index) => <button key={delivery.id} className={`delivery-card ${selectedDelivery === index ? "is-active" : ""}`} onClick={() => setSelectedDelivery(index)}><span>Entrega {index + 1}</span><strong>{delivery.title}</strong><small>{delivery.scenarios.length} cenário(s)</small></button>)}</div>{currentDelivery?.stories && currentDelivery.stories.length > 0 && <div className="story-list"><h3>História organizada</h3>{currentDelivery.stories.map((story) => <article className="story-card" key={story.id}><strong>{story.title}</strong><span>{story.requirement.acceptanceCriteria.length} critério(s) de aceite · {story.scenarioIds.length} STEP(s)</span></article>)}</div>}{currentDelivery?.requirement && <div className="requirement-summary"><h3>História de Usuário estruturada</h3><div className="requirement-grid"><div><strong>Como um</strong><p>{currentDelivery.requirement.userStory.asA.join("\n") || "Não informado no conteúdo de origem."}</p></div><div><strong>Eu quero</strong><p>{currentDelivery.requirement.userStory.iWant.join("\n") || "Não informado no conteúdo de origem."}</p></div><div><strong>Para que</strong><p>{currentDelivery.requirement.userStory.soThat.join("\n") || "Não informado no conteúdo de origem."}</p></div><div><strong>Critérios de aceitação</strong><p>{currentDelivery.requirement.acceptanceCriteria.join("\n") || "Não informado no conteúdo de origem."}</p></div><div><strong>Regras de negócio</strong><p>{currentDelivery.requirement.businessRules.join("\n") || "Não informado no conteúdo de origem."}</p></div><div><strong>Restrições</strong><p>{currentDelivery.requirement.technicalConstraints.join("\n") || "Nenhuma restrição identificada no conteúdo fornecido."}</p></div><div><strong>Dependências</strong><p>{currentDelivery.requirement.dependencies.join("\n") || "Nenhuma dependência identificada no conteúdo fornecido."}</p></div><div><strong>Pontos de Atenção</strong><p>{currentDelivery.requirement.attentionPoints.join("\n") || "Nenhum ponto de atenção identificado no conteúdo fornecido."}</p></div></div>{currentDelivery.requirement.gaps.length > 0 && <div className="requirement-gaps"><strong>GAPS E INDEFINIÇÕES</strong><ul>{currentDelivery.requirement.gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul></div>}</div>}<div className="action-row"><button className="button button-secondary" onClick={() => setStage("fonte")}>Voltar à fonte</button><button className="button button-primary" onClick={() => setStage("steps")}>Gerar STEPs</button></div></section>}

      {stage === "steps" && material && <section className="workspace"><div className="section-heading"><div><p className="eyebrow">Etapa 03</p><h2>Gerar STEPs</h2></div><span className="status-badge">Todos os cenários da fonte</span></div><p className="section-lead">Os cenários exibem somente o que foi reconhecido na fonte. Ausências são registradas como gaps.</p><div className="action-row"><button className="button button-primary" disabled={!stepsText} onClick={() => copyText(stepsText, "Cenários STEP")}>Copiar todos os STEPs</button></div><div className="scenario-stack">{scenarios.length ? scenarios.map((scenario, index) => <article className="scenario-card" key={scenario.id}><div className="scenario-top"><span>STEP {scenarioNumber(scenario, index)}</span><span className={scenario.status === "pronto" ? "status-ok" : "status-gap"}>{scenario.status === "pronto" ? "Fonte completa" : "Há gaps"}</span></div><h3>{scenario.title}</h3><p className="reference">História/Requisito: {scenario.storyTitle ?? scenario.title}</p><p className="scenario-origin">Origem: Página {scenario.origin?.page ?? "não identificada"} — {scenario.origin?.excerpt || "Trecho não identificado."}</p><p className="reference">Referência: {scenario.reference}</p><div className="scenario-content"><h4>Pré-condições</h4>{renderBulletList(scenario.preconditions)}{scenario.sourceMode !== "narrative" && scenario.data && scenario.data.length > 0 && <><h4>Dados de teste</h4><p>{renderList(scenario.data)}</p></>}<h4>Passos</h4><ol>{scenario.steps.length ? scenario.steps.map((item, itemIndex) => <li key={itemIndex}>{item}</li>) : <li>Não informado no conteúdo de origem.</li>}</ol><h4>Resultado esperado</h4>{renderBulletList(scenario.expectedResult)}{scenario.gaps.length > 0 && <><h4>Gaps e indefinições</h4><ul>{scenario.gaps.map((gap, gapIndex) => <li key={gapIndex}>{gap}</li>)}</ul></>}</div><button className="button button-secondary" onClick={() => copyText(formatScenario(scenario), "STEP")}>Copiar STEP</button></article>) : <div className="empty-state">Nenhum cenário estruturado foi reconhecido. A fonte original continua preservada na primeira etapa.</div>}</div>{exportBundle?.gaps.length ? <div className="requirement-summary"><h3>Gaps e indefinições</h3><div className="requirement-gaps"><ul>{exportBundle.gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul></div></div> : null}<div className="action-row"><button className="button button-secondary" onClick={() => setStage("entregas")}>Voltar à história</button><button className="button button-primary" onClick={() => setStage("performance")}>Analisar Performance</button></div></section>}

      {stage === "performance" && material && <section className="workspace"><div className="section-heading"><div><p className="eyebrow">Etapa 04</p><h2>Análise Preventiva de Performance</h2></div><span className="status-badge">Riscos observáveis</span></div><p className="section-lead">A análise identifica riscos observáveis e implícitos nos STEPs, sem propor soluções técnicas.</p><div className="scenario-stack">{performanceValidations.length ? performanceValidations.map((item) => <article className="scenario-card" key={`${item.title}-${item.objective}`}><h3>{item.title}</h3><div className="scenario-content"><h4>Objetivo</h4><p>{item.objective}</p><h4>Risco identificado</h4><p>{item.risk}</p><h4>Como testar</h4><p>{item.howToTest}</p><h4>Ferramenta recomendada</h4><p>{item.recommendedTool}</p><h4>Resultado esperado</h4><p>{item.expectedResult}</p><h4>Justificativa</h4><p>{item.rationale}</p></div></article>) : <div className="empty-state">Nenhum risco preventivo aplicável foi identificado nos STEPs.</div>}</div><div className="action-row"><button className="button button-secondary" onClick={() => setStage("steps")}>Voltar aos STEPs</button><button className="button button-primary" onClick={() => setStage("gaps")}>Ver Gaps e Indefinições</button></div></section>}

      {stage === "gaps" && material && <section className="workspace"><div className="section-heading"><div><p className="eyebrow">Etapa 05</p><h2>Gaps e Indefinições</h2></div><span className="status-badge">Não preenchidos automaticamente</span></div><p className="section-lead">As lacunas são registradas para decisão do time. Nenhuma informação ausente é inventada ou completada.</p><div className="scenario-stack">{exportBundle?.gaps.length ? exportBundle.gaps.map((gap) => <article className="scenario-card" key={gap}><h3>Indefinição identificada</h3><p>{gap}</p></article>) : <div className="empty-state">Nenhum gap ou indefinição foi consolidado.</div>}</div><div className="action-row"><button className="button button-secondary" onClick={() => setStage("performance")}>Voltar à Performance</button><button className="button button-primary" onClick={() => setStage("export")}>Exportar Resultado</button></div></section>}

      {stage === "export" && material && exportBundle && <section className="workspace"><div className="section-heading"><div><p className="eyebrow">Etapa 06</p><h2>Exportar Resultado</h2></div><span className="status-badge">3 formatos disponíveis</span></div><p className="section-lead">Exporte os STEPs, as validações preventivas e os gaps consolidados para uso no trabalho de QA.</p><div className="export-grid"><button className="export-card" onClick={() => downloadExport(formatExportText(exportBundle), "erika-qa-resultado.txt", "text/plain;charset=utf-8")}><strong>TXT</strong><span>Resultado em texto simples.</span></button><button className="export-card" onClick={() => downloadExport(formatExportMarkdown(exportBundle), "erika-qa-resultado.md", "text/markdown;charset=utf-8")}><strong>Markdown</strong><span>Resultado estruturado para documentação.</span></button><button className="export-card" onClick={() => downloadExport(formatExportExcel(exportBundle), "erika-qa-resultado.xls", "application/vnd.ms-excel;charset=utf-8")}><strong>Excel</strong><span>Planilha tabulada compatível com Excel.</span></button></div><div className="action-row"><button className="button button-secondary" onClick={() => setStage("gaps")}>Voltar aos Gaps</button></div></section>}

      <footer className="qa-footer">O que não está na fonte não vira requisito. O conteúdo permanece no dispositivo.</footer>
    </main>
  );
}
