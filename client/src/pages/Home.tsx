import { BrandMark } from "@/components/BrandMark";
import {
  CaseChannel,
  CaseKind,
  CasePriority,
  CaseStatus,
  channelOptions,
  initialCases,
  initialContext,
  kindOptions,
  priorityOptions,
  ProjectContext,
  statusOptions,
  TestCase,
} from "@/lib/dashboard-data";
import { assessAppRequirements, configurationSteps, recommendMobileTool, MobileTool } from "@/lib/app-advisor";
import { detectComplexPdfLayoutPages, detectPdfContexts, extractPdfEvidence, pdfSourceText } from "@/lib/pdf-reader";
import { createImageContext, createLogContext, createSpreadsheetContext, EvidenceContext, evidenceContextToSourceBlock } from "@/lib/evidence-contexts";
import { appendEvidenceBlocks, countLogLines } from "@/lib/evidence-sources";
import { extractSpreadsheetEvidence } from "@/lib/xlsx-reader";
import { formatScenario, GenerationScope, organizeQaMaterial, OrganizedQaMaterial, OrganizedSection } from "@/lib/qa-organizer";
import {
  AlertTriangle,
  ArrowDownToLine,
  Check,
  ClipboardCheck,
  Copy,
  FileText,
  FileSpreadsheet,
  FileUp,
  Image,
  ListChecks,
  Menu,
  PenLine,
  Plus,
  RefreshCw,
  ScrollText,
  Smartphone,
  Sparkles,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import React, { ChangeEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const CASES_KEY = "sinal-qa-cases-v2";
const CONTEXT_KEY = "sinal-qa-context-v2";
const SOURCE_KEY = "sinal-qa-source-v2";
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ANALYZABLE_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

type UpdateCase = (id: string, field: keyof TestCase, value: TestCase[keyof TestCase]) => void;
type PdfRequirementContext = { title: string; pages: number[]; sourceExcerpts: string[]; visualEvidence: string[]; status: "fornecido" | "a confirmar" };
type ImportedEvidence = { id: string; type: "PDF" | "Imagem" | "Log" | "Planilha"; name: string; detail: string; state: "fornecido" | "a confirmar" };

function loadPersisted<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readableTimestamp(): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date());
}

function nextCaseId(cases: TestCase[]): string {
  const last = cases.reduce((largest, item) => Math.max(largest, Number(item.id.replace(/\D/g, "")) || 0), 0);
  return `QA-${String(last + 1).padStart(3, "0")}`;
}

function money(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD", minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value || 0);
}

function statusClass(status: CaseStatus): "ready" | "attention" | "blocked" {
  return status === "Pronto" ? "ready" : status === "Atenção" ? "attention" : "blocked";
}

function evidenceLabel(evidence: OrganizedSection["evidence"]): string {
  return evidence === "fornecido" ? "fornecido" : evidence === "organizado" ? "organizado" : "a confirmar";
}

function EvidenceRuler({ state, label = "Régua de evidência" }: { state: OrganizedSection["evidence"]; label?: string }) {
  const normalized = state === "a confirmar" ? "a-confirmar" : state;
  return <div className="evidence-ruler"><span className="evidence-ruler__mark" aria-hidden="true"><span /><span /></span><span>{label}</span><span className={`evidence-ruler__state evidence-ruler__state--${normalized}`}>{evidenceLabel(state)}</span></div>;
}

async function copyToClipboard(value: string, description: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${description} copiado.`);
  } catch {
    const helper = document.createElement("textarea");
    helper.value = value;
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
    toast.success(`${description} copiado.`);
  }
}

function assertAnalyzableImage(file: File) {
  if (!ANALYZABLE_IMAGE_TYPES.has(file.type)) throw new Error("Formato de imagem não permitido.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("A imagem excede o limite seguro de análise.");
}

export default function Home() {
  const [cases, setCases] = useState<TestCase[]>(() => loadPersisted(CASES_KEY, initialCases));
  const [context, setContext] = useState<ProjectContext>(() => {
    const saved = loadPersisted(CONTEXT_KEY, initialContext);
    return saved.projectName === "Projeto sem nome" ? { ...saved, projectName: initialContext.projectName, objective: initialContext.objective } : saved;
  });
  const [contextDraft, setContextDraft] = useState<ProjectContext>(context);
  const [sourceText, setSourceText] = useState(() => loadPersisted(SOURCE_KEY, context.contextText));
  const [sourceReadConfirmed, setSourceReadConfirmed] = useState(false);
  const [material, setMaterial] = useState<OrganizedQaMaterial | null>(null);
  const [generationScope, setGenerationScope] = useState<GenerationScope>("completo");
  const [activeFilter, setActiveFilter] = useState<"Todos" | CaseStatus>("Todos");
  const [activeSection, setActiveSection] = useState("inicio");
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isReadingPdf, setIsReadingPdf] = useState(false);
  const [pdfMessage, setPdfMessage] = useState("Nenhum PDF lido nesta sessão.");
  const [pdfContexts, setPdfContexts] = useState<PdfRequirementContext[]>([]);
  const [evidenceContexts, setEvidenceContexts] = useState<EvidenceContext[]>([]);
  const [importedEvidence, setImportedEvidence] = useState<ImportedEvidence[]>([]);
  const [isReadingEvidence, setIsReadingEvidence] = useState(false);
  const [selectedMobileTool, setSelectedMobileTool] = useState<MobileTool>("Maestro");
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const logInputRef = useRef<HTMLInputElement>(null);
  const spreadsheetInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { try { localStorage.setItem(CASES_KEY, JSON.stringify(cases)); } catch { console.warn("Não foi possível persistir os casos localmente."); } }, [cases]);
  useEffect(() => { try { localStorage.setItem(CONTEXT_KEY, JSON.stringify(context)); } catch { console.warn("Não foi possível persistir o contexto localmente."); } }, [context]);
  useEffect(() => { try { localStorage.setItem(SOURCE_KEY, JSON.stringify(sourceText)); } catch { console.warn("O texto de origem ficou grande demais para persistência local, mas continua disponível nesta sessão."); } }, [sourceText]);

  const metrics = useMemo(() => {
    const ready = cases.filter((item) => item.status === "Pronto").length;
    const attention = cases.filter((item) => item.status === "Atenção").length;
    const blocked = cases.filter((item) => item.status === "Bloqueado").length;
    return {
      ready,
      attention,
      blocked,
      coverage: cases.length ? Math.round((ready / cases.length) * 100) : 0,
      totalCost: cases.reduce((sum, item) => sum + item.cost, 0),
      averageLatency: cases.length ? cases.reduce((sum, item) => sum + item.latency, 0) / cases.length : 0,
    };
  }, [cases]);

  const filteredCases = useMemo(
    () => (activeFilter === "Todos" ? cases : cases.filter((item) => item.status === activeFilter)),
    [activeFilter, cases],
  );

  const appAssessment = useMemo(() => assessAppRequirements(sourceText, material), [sourceText, material]);
  const suggestedMobileTool = useMemo(
    () => recommendMobileTool(sourceText, appAssessment.platforms),
    [sourceText, appAssessment.platforms],
  );

  useEffect(() => {
    if (appAssessment.isAppRelated) setSelectedMobileTool(suggestedMobileTool);
  }, [appAssessment.isAppRelated, suggestedMobileTool]);

  const selectSection = (id: string) => {
    setActiveSection(id);
    setIsMobileNavOpen(false);
    window.requestAnimationFrame(() => document.getElementById("qa-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const updateCase: UpdateCase = (id, field, value) => {
    setCases((current) => current.map((item) => (item.id === id ? { ...item, [field]: value, updatedAt: readableTimestamp() } : item)));
  };

  const addCase = (name = "Novo cenário para detalhar", kind: CaseKind = "Funcional") => {
    setCases((current) => [
      {
        id: nextCaseId(current),
        name,
        kind,
        channel: "Web",
        priority: "P2",
        status: "Atenção",
        latency: 0,
        cost: 0,
        owner: "Não informado",
        updatedAt: readableTimestamp(),
      },
      ...current,
    ]);
    toast.success("Caso adicionado à planilha.");
  };

  const generateMaterial = () => {
    if (!sourceReadConfirmed) {
      toast.error("Conclua a leitura integral da fonte antes de organizar o material.");
      return;
    }
    const generated = organizeQaMaterial(sourceText, generationScope);
    if (!generated) {
      toast.error("Cole ou importe um texto antes de organizar.");
      return;
    }
    setMaterial(generated);
    toast.success("Material organizado sem acrescentar fatos à fonte.");
  };

  const replaceMaterialFromSource = (nextSource: string) => {
    setSourceText(nextSource);
    setGenerationScope("completo");
    setMaterial(null);
    setSourceReadConfirmed(false);
  };

  const handleLogs = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setIsReadingEvidence(true);
    try {
      const contexts: EvidenceContext[] = [];
      const evidence: ImportedEvidence[] = [];
      for (const file of files) {
        const content = await file.text();
        const id = `log-${file.name}-${file.lastModified}`;
        contexts.push(createLogContext(file.name, content, id));
        evidence.push({ id, type: "Log", name: file.name, detail: `${countLogLines(content)} linha(s) preservada(s)`, state: "fornecido" });
      }
      const nextSource = appendEvidenceBlocks(sourceText, contexts.map(evidenceContextToSourceBlock));
      replaceMaterialFromSource(nextSource);
      setEvidenceContexts((current) => [...current, ...contexts]);
      setImportedEvidence((current) => [...current, ...evidence]);
      toast.success(`${files.length} log${files.length === 1 ? "" : "s"} incorporado${files.length === 1 ? "" : "s"} como evidência textual.`);
    } catch {
      toast.error("Não foi possível ler um dos logs. O texto atual foi preservado.");
    } finally {
      setIsReadingEvidence(false);
      event.target.value = "";
    }
  };

  const handleSpreadsheets = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setIsReadingEvidence(true);
    try {
      const contexts: EvidenceContext[] = [];
      const evidence: ImportedEvidence[] = [];
      for (const file of files) {
        const extraction = await extractSpreadsheetEvidence(file);
        const id = `spreadsheet-${file.name}-${file.lastModified}`;
        contexts.push(createSpreadsheetContext(file.name, extraction.sourceText, extraction.sheets.map((sheet) => sheet.name), id));
        evidence.push({ id, type: "Planilha", name: file.name, detail: `${extraction.sheetCount} aba${extraction.sheetCount === 1 ? "" : "s"} e ${extraction.rowCount} linha${extraction.rowCount === 1 ? "" : "s"} preservada${extraction.rowCount === 1 ? "" : "s"}`, state: extraction.sheetCount ? "fornecido" : "a confirmar" });
      }
      const nextSource = appendEvidenceBlocks(sourceText, contexts.map(evidenceContextToSourceBlock));
      replaceMaterialFromSource(nextSource);
      setEvidenceContexts((current) => [...current, ...contexts]);
      setImportedEvidence((current) => [...current, ...evidence]);
      toast.success(`${files.length} planilha${files.length === 1 ? "" : "s"} incorporada${files.length === 1 ? "" : "s"} como fonte rastreável.`);
    } catch {
      toast.error("Não foi possível ler uma das planilhas. O texto atual foi preservado.");
    } finally {
      setIsReadingEvidence(false);
      event.target.value = "";
    }
  };

  const handleImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setIsReadingEvidence(true);
    try {
      const contexts: EvidenceContext[] = [];
      const evidence: ImportedEvidence[] = [];
      for (const file of files) {
        assertAnalyzableImage(file);
        const id = `image-${file.name}-${file.lastModified}`;
        contexts.push(createImageContext(file.name, [], ["Imagem anexada sem descrição textual; confirmar a evidência visual manualmente."], id));
        evidence.push({ id, type: "Imagem", name: file.name, detail: "Anexada localmente; descrição visual não inferida", state: "a confirmar" });
      }
      const nextSource = appendEvidenceBlocks(sourceText, contexts.map(evidenceContextToSourceBlock));
      replaceMaterialFromSource(nextSource);
      setEvidenceContexts((current) => [...current, ...contexts]);
      setImportedEvidence((current) => [...current, ...evidence]);
      toast.success(`${files.length} imagem${files.length === 1 ? "" : "s"} incorporada${files.length === 1 ? "" : "s"} como evidência.`);
    } catch {
      toast.error("Não foi possível analisar uma das imagens. O texto atual foi preservado.");
    } finally {
      setIsReadingEvidence(false);
      event.target.value = "";
    }
  };

  const handlePdf = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsReadingPdf(true);
    setPdfContexts([]);
    setPdfMessage(`Lendo “${file.name}” localmente…`);
    try {
      const extraction = await extractPdfEvidence(file);
      const extractedSource = pdfSourceText(extraction);
      const localContexts = detectPdfContexts(extraction.pages);
      const complexLayoutPages = detectComplexPdfLayoutPages(extraction.pages);
      const sourceWithPdf = appendEvidenceBlocks(sourceText, [`[PDF: ${file.name}]\n${extractedSource}`]);
      const complexLayoutNotice = complexLayoutPages.length
        ? ` ${complexLayoutPages.length} página${complexLayoutPages.length === 1 ? " contém" : "s contêm"} tabela ou layout com múltiplas colunas; a relação visual entre células deve ser confirmada na própria página.`
        : "";
      const pageNotice = extraction.hasSearchableText
        ? "Todo o texto disponível na camada pesquisável foi extraído em ordem de página."
        : "Uma ou mais páginas não possuem camada de texto pesquisável e precisam de conferência visual manual.";
      const importedPdf: ImportedEvidence = { id: `pdf-${file.name}-${file.lastModified}`, type: "PDF", name: file.name, detail: `${extraction.pageCount} página${extraction.pageCount === 1 ? "" : "s"} percorrida${extraction.pageCount === 1 ? "" : "s"} integralmente`, state: extraction.hasSearchableText ? "fornecido" : "a confirmar" };
      const contextsAsEvidence: EvidenceContext[] = localContexts.map((context, index) => ({ id: `pdf-local-${file.name}-${index}`, origin: "PDF" as const, title: context.title, sourceExcerpts: context.sourceExcerpts, visualEvidence: [], attention: context.status === "a confirmar" ? ["O PDF não forneceu título explícito de requisito para este contexto."] : [], status: context.status }));
      setPdfContexts(localContexts);
      setEvidenceContexts((current) => [...current, ...contextsAsEvidence]);
      setImportedEvidence((current) => [...current, importedPdf]);
      setSourceText(sourceWithPdf);
      setMaterial(null);
      setSourceReadConfirmed(false);
        setPdfMessage(`${file.name} · ${extraction.pageCount} página${extraction.pageCount === 1 ? "" : "s"} lida${extraction.pageCount === 1 ? "" : "s"} integralmente. ${pageNotice}${complexLayoutNotice} Confirme a leitura após revisar o texto preservado.`);
      toast.success("PDF lido localmente e preservado integralmente. A organização está aguardando sua confirmação.");
    } catch {
      setPdfMessage("Não foi possível ler o PDF. Nenhum texto foi criado ou alterado.");
      toast.error("Não foi possível concluir a análise do PDF. O conteúdo existente foi preservado.");
    } finally {
      setIsReadingPdf(false);
      event.target.value = "";
    }
  };

  const exportCsv = () => {
    const headers = ["ID", "Cenário", "Tipo", "Canal", "Prioridade", "Status", "Latência (s)", "Custo (USD)", "Responsável", "Atualizado"];
    const rows = cases.map((item) => [item.id, item.name, item.kind, item.channel, item.priority, item.status, item.latency, item.cost, item.owner, item.updatedAt]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ferramenta-da-qa-casos-de-teste.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Planilha exportada em CSV.");
  };

  const openContext = () => {
    setContextDraft(context);
    setIsContextOpen(true);
  };

  const saveContext = () => {
    setContext(contextDraft);
    setIsContextOpen(false);
    toast.success("Dados do projeto atualizados.");
  };

  const navigation = [
    { label: "Início", shortLabel: "1. Início", target: "inicio", icon: Sparkles, help: "Entenda a finalidade da ferramenta" },
    { label: "Fonte", shortLabel: "2. Fonte", target: "fonte", icon: FileText, help: "Carregue e confira os requisitos" },
    { label: "Triagem", shortLabel: "3. Triagem", target: "triagem", icon: PenLine, help: "Revise os contextos encontrados" },
    { label: "Testes", shortLabel: "4. Testes", target: "cenarios", icon: ListChecks, help: "Veja os testes organizados" },
    { label: "Gherkin", shortLabel: "5. Gherkin", target: "gherkin", icon: ScrollText, help: "Copie o Gherkin por referência" },
    { label: "Cards de bug", shortLabel: "6. Bugs", target: "bugs", icon: Wrench, help: "Copie cards prontos para revisar" },
    ...(appAssessment.isAppRelated ? [{ label: "Aplicativo", shortLabel: "7. Aplicativo", target: "aplicativo", icon: Smartphone, help: "Configure e valide o app" }] : []),
    { label: "Planilha", shortLabel: `${appAssessment.isAppRelated ? "8" : "7"}. Planilha`, target: "planilha", icon: ClipboardCheck, help: "Edite e acompanhe os casos" },
  ];
  const activeNavigation = navigation.find((item) => item.target === activeSection) ?? navigation[0];
  const featureDescriptions: Record<string, string> = {
    fonte: "Cole ou importe PDF, XLSX, imagens de erro e logs. O conteúdo permanece editável e rastreável.",
    triagem: "Confira os contextos que foram separados da documentação e confirme o que ainda precisa de revisão.",
    cenarios: "Veja os testes STEP organizados por entrega, com referência de origem e pontos a confirmar.",
    gherkin: "Copie o Gherkin separado dos testes STEP, sempre vinculado à referência da fonte.",
    bugs: "Descreva o problema e copie um card separado por defeito, com correção, critérios de aceite e cenários aplicáveis.",
    aplicativo: "Quando a fonte indicar aplicativo, consulte configuração, ferramenta e testes móveis relacionados ao material.",
    planilha: "Edite os campos de acompanhamento, filtre situações e leve cenários organizados para a execução.",
  };

  return (
    <div className="app-shell lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="notebook-spine sticky top-0 z-40 hidden h-screen flex-col p-5 lg:flex">
        <BrandMark />
        <div className="mt-10">
          <p className="mono mb-3 px-3 text-[0.63rem] font-semibold uppercase tracking-[0.14em] text-[#a9c6cc]">Mesa de trabalho</p>
          <nav className="space-y-1" aria-label="Navegação da triagem">
            {navigation.map((item) => {
              const Icon = item.icon;
              return <button key={item.target} onClick={() => selectSection(item.target)} className={`nav-item ${activeSection === item.target ? "nav-item--active" : ""}`}><Icon size={17} /><span>{item.label}</span></button>;
            })}
          </nav>
        </div>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-slate-100">
          <p className="mono text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#b9dce4]">Regra de trabalho</p>
          <p className="mt-3 text-sm font-semibold leading-5">O que não está na fonte não vira fato no card.</p>
          <button onClick={() => selectSection("fonte")} className="mono mt-4 text-xs font-bold text-[#b9dce4] hover:text-white">VER TEXTO DE ORIGEM →</button>
        </div>
      </aside>

      <div className={`notebook-spine fixed inset-0 z-50 p-5 transition-transform duration-200 lg:hidden ${isMobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full max-w-xs flex-col">
          <div className="flex items-center justify-between"><BrandMark /><button onClick={() => setIsMobileNavOpen(false)} className="rounded-lg p-2 text-white hover:bg-white/10" aria-label="Fechar navegação"><X size={19} /></button></div>
          <nav className="mt-10 space-y-1">{navigation.map((item) => { const Icon = item.icon; return <button key={item.target} onClick={() => selectSection(item.target)} className={`nav-item ${activeSection === item.target ? "nav-item--active" : ""}`}><Icon size={17} />{item.label}</button>; })}</nav>
        </div>
      </div>

      <main className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-[#692076]/10 bg-[#fcfaff]/90 px-4 py-3 backdrop-blur-xl sm:px-7 lg:px-10">
          <div className="mx-auto flex max-w-[1580px] items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsMobileNavOpen(true)} className="rounded-lg border border-[#692076]/14 bg-white p-2 text-[#692076] lg:hidden" aria-label="Abrir navegação"><Menu size={18} /></button>
              <div className="min-w-0"><p className="mono text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#756278]">Projeto</p><button onClick={openContext} className="block max-w-[220px] truncate text-left text-sm font-bold text-[#38203f] hover:text-[#a523a3] sm:max-w-[460px]" title={context.projectName}>{context.projectName}</button></div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={exportCsv} className="quiet-button hidden sm:inline-flex"><ArrowDownToLine size={15} /> Exportar CSV</button>
              <button onClick={() => addCase()} className="primary-button"><Plus size={16} /> Novo caso</button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1580px] px-4 py-7 sm:px-7 lg:px-10 lg:py-10">
          <section id="inicio" role="tabpanel" aria-labelledby="tab-inicio" hidden={activeSection !== "inicio"} className="brand-hero enter-rise relative overflow-hidden rounded-xl border border-[#692076]/14 px-6 py-8 sm:px-9 sm:py-10">
            <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_390px] xl:items-center">
              <div>
                <p className="mono text-[0.64rem] font-bold uppercase tracking-[0.14em] text-[#48e2ef]">Ferramenta de trabalho para QA</p>
                <h1 className="display-serif mt-4 max-w-3xl text-4xl leading-[1.02] tracking-[-0.04em] text-[#f7edf9] sm:text-6xl">Cenários claros. <em className="text-[#ea39cb]">Bugs prontos.</em></h1>
                <p className="mt-5 max-w-2xl text-sm leading-6 text-[#e8ddea] sm:text-base">Leia seus documentos, organize as entregas em blocos e revise o material de QA antes de usar.</p>
                <div className="mt-6 flex flex-wrap gap-3"><button onClick={() => selectSection("fonte")} className="primary-button"><FileUp size={15} /> Começar pela fonte</button><span className="inline-flex items-center rounded-lg border border-white/20 bg-black/15 px-3 py-2 text-xs font-semibold text-[#d8c9df]">A fonte é sempre a referência</span></div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-[#171028]/85 p-5 backdrop-blur-sm sm:p-6"><div className="flex items-center gap-3"><img src="assets/brand-mark.svg" alt="Marca da Ferramenta da QA" className="h-14 w-14 rounded-full border border-[#ea39cb]/60 object-cover" /><div><p className="text-sm font-extrabold text-white">Fluxo de trabalho</p><p className="text-xs text-[#c8b5d2]">Siga as etapas sem perder o contexto.</p></div></div><ol className="mt-5 grid gap-3 text-sm text-[#e9deed]"><li><strong className="text-[#48e2ef]">01 ·</strong> Carregue ou cole a documentação.</li><li><strong className="text-[#48e2ef]">02 ·</strong> Divida as entregas e revise os blocos.</li><li><strong className="text-[#48e2ef]">03 ·</strong> Gere cenários organizados e use-os como base para Gherkin, sempre conferindo a fonte.</li><li><strong className="text-[#48e2ef]">04 ·</strong> Abra cards de bug a partir do problema informado.</li></ol></div>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{navigation.filter((item) => item.target !== "inicio").map((item) => { const Icon = item.icon; return <button key={item.target} type="button" onClick={() => selectSection(item.target)} className="feature-card text-left"><span className="feature-card__icon"><Icon size={17} /></span><span><strong className="block text-sm">{item.label}</strong><span className="mt-1 block text-xs leading-5 opacity-75">{featureDescriptions[item.target]}</span></span></button>; })}</div>
          </section>

          <div id="qa-workspace" className="mt-6 scroll-mt-24">
            <nav className="tab-strip" aria-label="Etapas do painel" role="tablist">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.target;
                return <button key={item.target} id={`tab-${item.target}`} type="button" role="tab" aria-selected={isActive} aria-controls={item.target} onClick={() => selectSection(item.target)} className={`tab-strip__item ${isActive ? "tab-strip__item--active" : ""}`}><span className="tab-strip__number">{item.shortLabel.split(".")[0]}</span><Icon size={16} /><span className="min-w-0 text-left"><strong className="block truncate">{item.label}</strong><small className="hidden truncate font-normal opacity-70 sm:block">{item.help}</small></span></button>;
              })}
            </nav>
            <div className="mt-3 flex items-center justify-between gap-3 px-1"><p className="mono text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[#60777d]">Etapa atual · {activeNavigation.label}</p><p className="hidden text-xs text-[#6a7a7f] sm:block">Você pode voltar a qualquer etapa sem perder o que já informou.</p></div>
          </div>

          <section id="fonte" role="tabpanel" aria-labelledby="tab-fonte" hidden={activeSection !== "fonte"} className="enter-rise enter-rise--late mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)]">
            <article className="paper-panel overflow-hidden rounded-md">
              <div className="border-b border-[#123b49]/10 px-5 py-5 sm:px-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><EvidenceRuler state={sourceText.trim() && sourceText !== initialContext.contextText ? "fornecido" : "a confirmar"} label="01 · fonte" /><h2 className="mt-2 text-xl font-extrabold tracking-[-0.04em] text-[#20383f]">Requisitos e arquivos</h2><p className="mt-1 text-sm leading-5 text-[#65757b]">Cole um texto ou importe PDF, planilha XLSX, imagem de erro e logs. Confira o conteúdo antes de organizar.</p></div>
                  <div className="flex flex-wrap gap-2"><button onClick={() => pdfInputRef.current?.click()} disabled={isReadingPdf || isReadingEvidence} className="quiet-button"><FileUp size={15} /> {isReadingPdf ? "Lendo PDF…" : "Ler PDF"}</button><button onClick={() => spreadsheetInputRef.current?.click()} disabled={isReadingEvidence} className="quiet-button"><FileSpreadsheet size={15} /> Importar XLSX</button><button onClick={() => imageInputRef.current?.click()} disabled={isReadingEvidence} className="quiet-button"><Image size={15} /> {isReadingEvidence ? "Lendo evidência…" : "Imagem de erro"}</button><button onClick={() => logInputRef.current?.click()} disabled={isReadingEvidence} className="quiet-button"><ScrollText size={15} /> Importar log</button><button onClick={() => { setSourceText(""); setSourceReadConfirmed(false); setMaterial(null); setPdfContexts([]); setEvidenceContexts([]); setImportedEvidence([]); setPdfMessage("Fonte limpa. Nenhum conteúdo foi mantido."); }} className="quiet-button"><X size={15} /> Limpar</button></div>
                </div>
                <input ref={pdfInputRef} className="hidden" type="file" accept="application/pdf,.pdf" onChange={handlePdf} />
                <input ref={spreadsheetInputRef} className="hidden" type="file" accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx" multiple onChange={handleSpreadsheets} />
                <input ref={imageInputRef} className="hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={handleImages} />
                <input ref={logInputRef} className="hidden" type="file" accept="text/plain,text/csv,application/json,application/xml,.log,.txt,.json,.xml,.csv" multiple onChange={handleLogs} />
                <div className="mt-4 flex gap-3 rounded-xl border border-[#0c5b73]/12 bg-[#edf5f5] p-3 text-xs leading-5 text-[#45646b]"><FileText size={16} className="mt-0.5 shrink-0 text-[#0c5b73]" /><p><strong>Leitura fiel:</strong> {pdfMessage}</p></div>
                {pdfContexts.length > 0 && <details className="source-margin mt-3 bg-[#fbfbf7] p-3"><summary className="cursor-pointer text-xs font-extrabold text-[#315057]">{pdfContexts.length} contexto{pdfContexts.length === 1 ? "" : "s"} separado{pdfContexts.length === 1 ? "" : "s"} a partir do PDF</summary><div className="mt-3 grid gap-2">{pdfContexts.map((item, index) => <div key={`${item.title}-${index}`} className="border-t border-[#123b49]/10 pt-2 text-xs leading-5 text-[#607277]"><strong className="text-[#314e55]">{item.title}</strong> · página{item.pages.length === 1 ? "" : "s"} {item.pages.join(", ")} · {item.status}</div>)}</div></details>}
                {importedEvidence.length > 0 && <details className="source-margin mt-3 bg-[#fbfbf7] p-3"><summary className="cursor-pointer text-xs font-extrabold text-[#315057]">{importedEvidence.length} evidência{importedEvidence.length === 1 ? "" : "s"} importada{importedEvidence.length === 1 ? "" : "s"}</summary><div className="mt-3 grid gap-2">{importedEvidence.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 border-t border-[#123b49]/10 pt-2 text-xs leading-5 text-[#607277]"><span><strong className="text-[#314e55]">{item.type} · {item.name}</strong><br />{item.detail}</span><span className={`evidence-pill evidence-pill--${item.state === "a confirmar" ? "a-confirmar" : item.state}`}>{item.state}</span></div>)}</div></details>}
                {evidenceContexts.length > 0 && <details className="source-margin mt-3 bg-[#f7faf9] p-3"><summary className="cursor-pointer text-xs font-extrabold text-[#315057]">{evidenceContexts.length} contexto{evidenceContexts.length === 1 ? "" : "s"} rastreável{evidenceContexts.length === 1 ? "" : "is"} por origem</summary><div className="mt-3 grid gap-2">{evidenceContexts.map((item) => <div key={item.id} className="border-t border-[#123b49]/10 pt-2 text-xs leading-5 text-[#607277]"><div className="flex items-start justify-between gap-3"><strong className="text-[#314e55]">{item.title}</strong><span className={`evidence-pill evidence-pill--${item.status === "a confirmar" ? "a-confirmar" : item.status}`}>{item.status}</span></div><p className="mt-1">Origem: {item.origin} · {item.visualEvidence.length} evidência{item.visualEvidence.length === 1 ? "" : "s"} visual{item.visualEvidence.length === 1 ? "" : "is"} · {item.attention.length} ponto{item.attention.length === 1 ? "" : "s"} a confirmar</p></div>)}</div></details>}
              </div>
              <div className="p-5 sm:p-6">
                <textarea value={sourceText} onChange={(event) => { setSourceText(event.target.value); setMaterial(null); setSourceReadConfirmed(false); setPdfContexts([]); setEvidenceContexts([]); }} className="field-control min-h-[360px] resize-y p-4 text-sm leading-6" placeholder="Cole contexto, descrição do problema, critérios, logs ou texto extraído do PDF. Imagens são registradas como evidência visual marcada." aria-label="Texto de origem" />
                <div className="mt-4 rounded-xl border border-[#692076]/14 bg-[#fcf4fc] p-3 text-xs leading-5 text-[#5d4264]"><strong>Etapa obrigatória:</strong> a leitura integral ocorre no dispositivo. Revise todo o conteúdo preservado antes de avançar.</div>
                <div className="mt-4 flex flex-col gap-3 border-t border-[#123b49]/9 pt-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap items-center gap-2"><p className="mono text-[0.68rem] text-[#6d7c82]">{sourceText.trim() ? `${sourceText.trim().split(/\n+/).length} bloco(s) de origem` : "Aguardando texto de origem"}</p><select value={generationScope} onChange={(event) => setGenerationScope(event.target.value as GenerationScope)} className="field-control h-8 w-auto px-2 text-xs" aria-label="Escopo da geração"><option value="completo">Card completo</option><option value="criterios">Apenas critérios</option><option value="cenarios">Apenas cenários</option><option value="revisao">Revisar lacunas</option></select></div><div className="flex flex-wrap justify-end gap-2"><button onClick={() => setSourceReadConfirmed(true)} disabled={!sourceText.trim() || sourceReadConfirmed} className="quiet-button justify-center">{sourceReadConfirmed ? "Leitura confirmada" : "Confirmar leitura integral"}</button><button onClick={generateMaterial} disabled={!sourceReadConfirmed} className="primary-button justify-center disabled:cursor-not-allowed disabled:opacity-50"><Sparkles size={16} /> Organizar para QA</button></div></div>
              </div>
            </article>
          </section>

          <section id="triagem" role="tabpanel" aria-labelledby="tab-triagem" hidden={activeSection !== "triagem"} className="enter-rise enter-rise--late mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)]">
            <article className="paper-panel overflow-hidden rounded-2xl">
              <div className="border-b border-[#123b49]/10 px-5 py-5 sm:px-6"><EvidenceRuler state={material ? "organizado" : "a confirmar"} label="02 · triagem" /><h2 className="mt-2 text-xl font-extrabold tracking-[-0.04em] text-[#20383f]">Triagem dos contextos</h2><p className="mt-1 text-sm text-[#65757b]">Confira o que foi separado da fonte antes de levar um problema para um card.</p></div>
              {material ? <div className="space-y-5 p-5 sm:p-6"><div className="rounded-xl border border-[#0c5b73]/12 bg-[#edf5f5] p-4 text-sm leading-6 text-[#45646b]">A fonte foi organizada sem completar lacunas. Itens marcados como <strong>a confirmar</strong> precisam da sua revisão.</div><div className="grid gap-3 sm:grid-cols-2">{material.cards.flatMap((card) => card.sections.map((section) => ({ card, section }))).map(({ card, section }) => <div key={`${card.id}-${section.id}`} className="rounded-xl border border-[#123b49]/10 bg-white/70 p-4"><p className="mono text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[#75858a]">{card.title}</p><EvidenceRuler state={section.evidence} label={section.title} /><p className="mt-3 text-sm leading-6 text-[#52666c]">{section.content.join(" ")}</p></div>)}</div></div> : <EmptyResult onGenerate={generateMaterial} />}
            </article>
          </section>

          <section id="bugs" role="tabpanel" aria-labelledby="tab-bugs" hidden={activeSection !== "bugs"} className="enter-rise enter-rise--late mt-6">
            <article className="paper-panel overflow-hidden rounded-2xl">
              <div className="border-b border-[#123b49]/10 px-5 py-5 sm:px-6"><EvidenceRuler state={material ? "organizado" : "a confirmar"} label="04 · card de bug" /><h2 className="mt-2 text-xl font-extrabold tracking-[-0.04em] text-[#20383f]">Cards de bug para revisar e copiar</h2><p className="mt-1 text-sm text-[#65757b]">Cada problema fica em um card separado, com descrição, correção, critérios e cenários quando a fonte permitir.</p></div>
              {!material ? <EmptyResult onGenerate={() => { generateMaterial(); selectSection("bugs"); }} /> : <BugCards material={material} />}
            </article>
          </section>

          <section id="cenarios" role="tabpanel" aria-labelledby="tab-cenarios" hidden={activeSection !== "cenarios"} className="enter-rise enter-rise--late mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
            <article className="paper-panel overflow-hidden rounded-2xl">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#123b49]/10 px-5 py-5 sm:px-6"><div><EvidenceRuler state={material ? "organizado" : "a confirmar"} label="03 · cenários de teste" /><h2 className="mt-2 text-xl font-extrabold tracking-[-0.04em] text-[#20383f]">Testes por entrega</h2><p className="mt-1 text-sm text-[#65757b]">Cada parte da entrega tem seus próprios testes. Copie um caso para o YouTrack ou leve-o para a planilha.</p></div>{material && <div className="flex flex-wrap gap-2"><button onClick={() => copyToClipboard(material.scenarios.map(formatScenario).join("\n\n"), "Cenários de teste")} className="quiet-button"><Copy size={15} /> Copiar testes</button><button onClick={() => copyToClipboard(material.scenarios.map(formatScenario).join("\n\n"), "Casos para YouTrack")} className="quiet-button"><Copy size={15} /> Copiar para YouTrack</button></div>}</div>
              <div className="grid gap-3 p-5 sm:p-6">{material ? material.scenarios.map((scenario) => <ScenarioCard key={scenario.id} scenario={scenario} onAdd={() => addCase(scenario.title, "Funcional")} />) : <div className="rounded-xl border border-dashed border-[#123b49]/17 bg-[#f8f7f1] p-7 text-center"><ListChecks className="mx-auto text-[#88a1a6]" size={24} /><p className="mt-3 text-sm font-bold text-[#3d555c]">Os cenários aparecerão após organizar a fonte.</p></div>}</div>
            </article>
            <aside className="brand-brief overflow-hidden rounded-2xl border border-[#692076]/20 p-5 text-white">
              <p className="mono text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[#b9dce4]">Regra de cenários</p><h3 className="mt-4 text-xl font-extrabold leading-6 tracking-[-0.04em]">Organizar não é completar lacunas.</h3><p className="mt-3 text-sm leading-6 text-[#d6e5e7]">Quando a fonte não trouxer pré-condição, dado de entrada ou resultado esperado, o cenário sinaliza a necessidade de confirmação em vez de assumir uma resposta.</p><div className="mt-6 border-l-2 border-[#d69a35] bg-black/10 p-3 text-xs leading-5 text-[#f2e2bc]"><strong>Use o texto de origem como referência:</strong> ele permanece editável para ajuste antes de copiar.</div>
            </aside>
          </section>

          <section id="gherkin" role="tabpanel" aria-labelledby="tab-gherkin" hidden={activeSection !== "gherkin"} className="enter-rise enter-rise--late mt-6">
            <GherkinSection material={material} />
          </section>
          {appAssessment.isAppRelated && (
            <section id="aplicativo" role="tabpanel" aria-labelledby="tab-aplicativo" hidden={activeSection !== "aplicativo"} className="enter-rise enter-rise--late mt-6">
              <AppPanel
                evidence={appAssessment.evidence}
                platforms={appAssessment.platforms}
                scenarios={appAssessment.sourceTests}
                suggestedTool={suggestedMobileTool}
                selectedTool={selectedMobileTool}
                onSelectTool={setSelectedMobileTool}
              />
            </section>
          )}

          <section id="planilha" role="tabpanel" aria-labelledby="tab-planilha" hidden={activeSection !== "planilha"} className="enter-rise enter-rise--late mt-6 overflow-hidden rounded-2xl border border-[#123b49]/13 bg-[#fffefa] shadow-[0_16px_40px_rgba(34,54,60,.06)]">
            <div className="flex flex-col gap-4 border-b border-[#123b49]/10 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between"><div><EvidenceRuler state="organizado" label={`${appAssessment.isAppRelated ? "06" : "05"} · planilha de acompanhamento`} /><h2 className="mt-2 text-xl font-extrabold tracking-[-0.04em] text-[#20383f]">Todos os campos ficam editáveis</h2><p className="mt-1 text-sm text-[#65757b]">Nome, tipo, canal, prioridade, situação, latência, custo e responsável são persistidos neste navegador.</p></div><div className="flex flex-wrap gap-1.5">{(["Todos", ...statusOptions] as const).map((filter) => <button key={filter} onClick={() => setActiveFilter(filter)} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${activeFilter === filter ? "bg-[#123b49] text-white" : "bg-[#eef1ed] text-[#5c6b70] hover:bg-[#e2e8e4]"}`}>{filter}</button>)}</div></div>
            <div className="overflow-x-auto"><table className="min-w-[1160px] w-full text-left"><thead><tr className="bg-[#f4f5ef]">{["Cenário", "Tipo", "Canal", "Prioridade", "Situação", "Latência", "Custo", "Responsável", "Atualizado", ""].map((label) => <th key={label} className="mono border-b border-[#123b49]/9 px-4 py-3 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[#68777c]">{label}</th>)}</tr></thead><tbody>{filteredCases.length ? filteredCases.map((testCase) => <CaseRow key={testCase.id} testCase={testCase} onUpdate={updateCase} onRemove={(id) => setCases((current) => current.filter((item) => item.id !== id))} />) : <tr><td colSpan={10} className="px-6 py-10 text-center text-sm text-[#69787d]">Nenhum caso neste filtro. <button onClick={() => addCase()} className="font-bold text-[#0c5b73] underline underline-offset-4">Adicionar primeiro caso</button>.</td></tr>}</tbody></table></div>
            <div className="flex flex-col gap-3 border-t border-[#123b49]/9 px-5 py-4 text-sm text-[#64757a] sm:flex-row sm:items-center sm:justify-between"><p><span className="mono font-bold text-[#3a5158]">{filteredCases.length}</span> caso{filteredCases.length === 1 ? "" : "s"} visível{filteredCases.length === 1 ? "" : "is"} · custo da amostra: <strong>{money(metrics.totalCost)}</strong></p><button onClick={() => addCase()} className="primary-button self-start sm:self-auto"><Plus size={16} /> Adicionar linha</button></div>
          </section>

          <section className="mt-8 grid overflow-hidden rounded-2xl border border-[#123b49]/12 bg-[#f5f5ef] sm:grid-cols-3"><MetricCard label="Casos prontos" value={String(metrics.ready)} detail="marcados para execução" icon={<Check size={17} />} /><MetricCard label="Em atenção" value={String(metrics.attention + metrics.blocked)} detail="precisam de decisão" icon={<AlertTriangle size={17} />} /><MetricCard label="Latência média" value={`${metrics.averageLatency.toFixed(1)}s`} detail="registrada na planilha" icon={<RefreshCw size={17} />} /></section>
        </div>
      </main>

      {isContextOpen && <ContextDialog draft={contextDraft} onChange={setContextDraft} onClose={() => setIsContextOpen(false)} onSave={saveContext} />}
    </div>
  );
}

function EmptyResult({ onGenerate }: { onGenerate: () => void }) {
  return <div className="flex min-h-[460px] flex-col items-center justify-center px-7 py-12 text-center"><div className="source-stamp"><img src="assets/brand-mark.svg" alt="Marca da Ferramenta da QA" /></div><EvidenceRuler state="a confirmar" label="Saída pendente" /><h3 className="mt-5 text-lg font-extrabold tracking-[-0.04em] text-[#2a4147]">Aguardando a fonte</h3><p className="mt-2 max-w-sm text-sm leading-6 text-[#6a7a7f]">Cole o contexto ou importe um PDF com texto pesquisável. Depois, organize o conteúdo em seções prontas para revisar e copiar.</p><button onClick={onGenerate} className="quiet-button mt-6"><Sparkles size={15} /> Organizar texto atual</button></div>;
}

function BugCards({ material }: { material: OrganizedQaMaterial }) {
  return <div className="space-y-5 p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><p className="mono text-[0.62rem] font-bold uppercase tracking-[0.11em] text-[#60777d]">{material.cards.length} card{material.cards.length === 1 ? "" : "s"} separado{material.cards.length === 1 ? "" : "s"} por problema</p><span className="evidence-pill evidence-pill--organizado">{material.scope === "completo" ? "card completo" : material.scope}</span></div>{material.cards.map((card, cardIndex) => <section key={card.id} className="rounded-md border border-[#123b49]/12 bg-white/55 p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="source-margin pl-3"><p className="mono text-[0.62rem] font-bold uppercase tracking-[0.11em] text-[#60777d]">Problema {String(cardIndex + 1).padStart(2, "0")}</p><h3 className="display-serif mt-1 text-2xl leading-7 tracking-[-0.025em] text-[#223c43]">{card.title}</h3></div><button onClick={() => copyToClipboard(card.cardText, "Card de bug")} className="quiet-button"><Copy size={15} /> Copiar card</button></div><div className="mt-5 space-y-3">{card.sections.map((item) => <EvidenceSection key={`${card.id}-${item.id}`} section={item} />)}</div></section>)}</div>;
}

function EvidenceSection({ section }: { section: OrganizedSection }) {
  const confirmation = section.evidence === "a confirmar";
  return <section className={`source-margin rounded-r-xl border border-[#123b49]/10 bg-[#fbfbf7] p-4 ${confirmation ? "source-margin--confirm" : ""}`}><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-extrabold text-[#2a4248]">{section.title}</h4><span className={`evidence-pill evidence-pill--${section.evidence.replace(" ", "-")}`}>{evidenceLabel(section.evidence)}</span></div><ul className="mt-3 space-y-2 text-sm leading-6 text-[#5b6d72]">{section.content.map((line, index) => <li key={`${section.id}-${index}`} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#86a4aa]" />{line}</li>)}</ul></section>;
}

function ScenarioCard({ scenario, onAdd }: { scenario: OrganizedQaMaterial["scenarios"][number]; onAdd: () => void }) {
  const needsConfirmation = scenario.status === "a confirmar";
  const numbered = (items: string[]) => items.length ? items.map((item, index) => <li key={`${item}-${index}`}>{index + 1}. {item}</li>) : <li>Não informado nos artefatos.</li>;
  return <article className={`rounded-xl border p-4 ${needsConfirmation ? "border-[#d69a35]/35 bg-[#fff9ea]" : "border-[#123b49]/12 bg-[#fbfbf7]"}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="mono text-[0.61rem] font-bold uppercase tracking-[0.1em] text-[#76878c]">STEP {scenario.id.match(/bug-(\d+)/)?.[1] ?? "1"}</p><h3 className="mt-1 text-base font-extrabold text-[#2a4248]">{scenario.title}</h3><p className="mt-1 text-xs text-[#65777c]">Referência: {scenario.reference}</p><p className="mono mt-1 text-[0.61rem] font-bold uppercase tracking-[0.1em] text-[#76878c]">{needsConfirmation ? "há gaps e indefinições" : "base explícita"}</p></div>
      <div className="flex flex-wrap justify-end gap-2"><button onClick={() => copyToClipboard(formatScenario(scenario), "Cenário STEP")} className="quiet-button !px-2.5" aria-label={`Copiar ${scenario.title}`}><Copy size={14} /></button><button onClick={() => copyToClipboard(formatScenario(scenario), "Caso para YouTrack")} className="quiet-button !px-2.5" aria-label={`Copiar ${scenario.title} para o YouTrack`}>YouTrack</button><button onClick={onAdd} className="quiet-button !px-2.5" aria-label={`Adicionar ${scenario.title} à planilha`}><Plus size={14} /></button></div>
    </div>
    <div className="mt-4 grid gap-4 text-sm leading-6 text-[#53666b]">
      <section><h4 className="font-extrabold text-[#2a4248]">Pré-condições</h4><ul className="mt-1 list-none">{numbered(scenario.preconditions)}</ul></section>
      <section><h4 className="font-extrabold text-[#2a4248]">Passos</h4><ol className="mt-1 list-none">{numbered(scenario.steps)}</ol></section>
      <section><h4 className="font-extrabold text-[#2a4248]">Resultado esperado</h4><ul className="mt-1 list-none">{numbered(scenario.expectedResult)}</ul></section>
      <section><h4 className="font-extrabold text-[#2a4248]">Gaps e indefinições</h4><ul className="mt-1 list-none">{scenario.gaps.length ? scenario.gaps.map((gap, index) => <li key={`${gap}-${index}`}>- {gap}</li>) : <li>- Nenhuma lacuna registrada.</li>}</ul></section>
      {scenario.gherkin && <details className="rounded-lg bg-white/75 p-3"><summary className="cursor-pointer font-extrabold text-[#2a4248]">Gherkin</summary><pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs leading-5 text-[#53666b]">{scenario.gherkin}</pre></details>}
    </div>
  </article>;
}

function GherkinSection({ material }: { material: OrganizedQaMaterial | null }) {
  const scenarios = material?.scenarios.filter((scenario) => scenario.gherkin) ?? [];
  return <article className="paper-panel overflow-hidden rounded-2xl"><div className="border-b border-[#123b49]/10 px-5 py-5 sm:px-6"><EvidenceRuler state={material ? "organizado" : "a confirmar"} label="05 · gherkin" /><h2 className="mt-2 text-xl font-extrabold tracking-[-0.04em] text-[#20383f]">Gherkin</h2><p className="mt-1 text-sm text-[#65757b]">Cenários objetivos, separados dos testes STEP e vinculados à origem.</p></div>{scenarios.length ? <div className="space-y-3 p-5 sm:p-6">{scenarios.map((scenario) => <section key={scenario.id} className="rounded-xl border border-[#123b49]/12 bg-[#fbfbf7] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-extrabold text-[#2a4248]">{scenario.title}</h3><p className="mt-1 text-xs text-[#65777c]">Referência: {scenario.reference}</p></div><button onClick={() => copyToClipboard(scenario.gherkin, `Gherkin de ${scenario.title}`)} className="quiet-button"><Copy size={15} /> Copiar Gherkin</button></div><pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-lg bg-white p-4 text-xs leading-5 text-[#53666b]">{scenario.gherkin}</pre></section>)}</div> : <div className="p-6"><div className="rounded-xl border border-dashed border-[#123b49]/17 bg-[#f8f7f1] p-7 text-center text-sm text-[#5c7076]">{material ? "Nenhum Gherkin foi formado porque faltam informações explícitas na fonte." : "O Gherkin aparecerá depois que a fonte for organizada."}</div></div>}</article>;
}
function AppPanel({
  evidence,
  platforms,
  scenarios,
  suggestedTool,
  selectedTool,
  onSelectTool,
}: {
  evidence: string[];
  platforms: string[];
  scenarios: Array<{ title: string; source: string; check: string; status: "pronto" | "a confirmar" }>;
  suggestedTool: MobileTool;
  selectedTool: MobileTool;
  onSelectTool: (tool: MobileTool) => void;
}) {
  const steps = configurationSteps(selectedTool, platforms);
  return <article className="paper-panel overflow-hidden rounded-2xl"><div className="grid gap-5 border-b border-[#123b49]/10 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end"><div><EvidenceRuler state="fornecido" label="Aba condicional · aplicativo" /><div className="mt-3 flex items-start gap-3"><span className="source-stamp shrink-0"><img src="assets/brand-mark.svg" alt="" /></span><div><h2 className="text-xl font-extrabold tracking-[-0.04em] text-[#20383f]">Configuração e testes de aplicativo</h2><p className="mt-1 text-sm leading-5 text-[#65757b]">Esta aba apareceu porque o material menciona requisito móvel. Em documentos que não citam aplicativo, ela não é exibida.</p></div></div></div><div className="source-margin source-margin--confirm bg-[#fff8e9] p-4"><p className="mono text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[#855a1b]">Orientação operacional</p><p className="mt-2 text-sm leading-5 text-[#725d37]">A ferramenta sugerida organiza a execução de QA; ela não é um fato extraído do requisito.</p></div></div><div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,.88fr)_minmax(0,1.12fr)]"><div className="space-y-5"><section className="source-margin rounded-r-xl border border-[#123b49]/10 bg-[#fbfbf7] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-extrabold text-[#2a4248]">Evidências que ativaram a aba</h3><span className="evidence-pill evidence-pill--fornecido">fornecido</span></div><ul className="mt-3 space-y-2 text-sm leading-6 text-[#596d72]">{evidence.map((line, index) => <li key={`${line}-${index}`} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0c5b73]" />{line}</li>)}</ul></section><section className="rounded-xl border border-[#123b49]/10 bg-[#f2f7f6] p-4"><p className="mono text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[#597176]">Plataforma identificada</p><p className="mt-2 text-sm font-extrabold text-[#28444a]">{platforms.length ? platforms.join(" · ") : "Aplicativo mencionado, sem plataforma identificada"}</p><p className="mt-2 text-xs leading-5 text-[#65777c]">Se Android ou iOS não estiverem no texto, a configuração solicita confirmação em vez de assumir a plataforma.</p></section></div><div><div className="flex items-center justify-between gap-3"><div><EvidenceRuler state="organizado" label="Configuração da ferramenta" /><h3 className="mt-2 text-base font-extrabold text-[#29434a]">Qual ferramenta configurar?</h3></div><Wrench size={18} className="text-[#0c5b73]" /></div><div className="mt-4 flex flex-wrap gap-2">{(["Maestro", "Appium", "BrowserStack"] as MobileTool[]).map((tool) => <button key={tool} onClick={() => onSelectTool(tool)} className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${selectedTool === tool ? "border-[#0c5b73] bg-[#0c5b73] text-white" : "border-[#123b49]/14 bg-white text-[#55676d] hover:bg-[#eef4f3]"}`}>{tool}{tool === suggestedTool && <span className="ml-1.5 text-[0.6rem] opacity-80">sugerido</span>}</button>)}</div><ol className="mt-4 space-y-2.5 border-l border-[#0c5b73]/30 pl-4 text-sm leading-6 text-[#586c72]">{steps.map((step, index) => <li key={step} className="relative"><span className="absolute -left-[1.45rem] top-2 h-2 w-2 rounded-full bg-[#0c5b73]" /><span className="mono mr-2 text-[0.62rem] font-bold text-[#0c5b73]">{String(index + 1).padStart(2, "0")}</span>{step}</li>)}</ol></div></div><div className="border-t border-[#123b49]/10 px-5 py-5 sm:px-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><EvidenceRuler state={scenarios.length ? "organizado" : "a confirmar"} label="Testes de aplicativo" /><h3 className="mt-2 text-base font-extrabold text-[#29434a]">O que testar com base no requisito</h3></div>{scenarios.length > 0 && <button onClick={() => copyToClipboard(scenarios.map((scenario) => `${scenario.title}\nOrigem: ${scenario.source}\nVerificar: ${scenario.check}`).join("\n\n"), "Testes de aplicativo")} className="quiet-button"><Copy size={15} /> Copiar testes</button>}</div>{scenarios.length ? <div className="mt-4 grid gap-3 lg:grid-cols-2">{scenarios.map((scenario, index) => <div key={`${scenario.title}-${index}`} className={`rounded-xl border p-4 ${scenario.status === "a confirmar" ? "border-[#d69a35]/35 bg-[#fff9ea]" : "border-[#123b49]/11 bg-[#fbfbf7]"}`}><p className="text-sm font-extrabold text-[#29434a]">{scenario.title}</p><p className="mt-2 text-xs leading-5 text-[#62767b]"><strong>Fonte:</strong> {scenario.source}</p><p className="mt-2 text-xs leading-5 text-[#62767b]"><strong>Verificar:</strong> {scenario.check}</p></div>)}</div> : <div className="mt-4 source-margin source-margin--confirm bg-[#fff9ea] p-4 text-sm leading-6 text-[#745d34]">Organize primeiro o texto de origem para gerar testes vinculados ao requisito de aplicativo. A aba não criará fluxos móveis sem essa base.</div>}</div></article>;
}

function ContextDialog({ draft, onChange, onClose, onSave }: { draft: ProjectContext; onChange: (context: ProjectContext) => void; onClose: () => void; onSave: () => void }) {
  const update = (field: keyof ProjectContext, value: string) => onChange({ ...draft, [field]: value });
  return <div className="fixed inset-0 z-[60] flex items-end bg-[#102e37]/35 p-4 backdrop-blur-sm sm:items-center sm:justify-center"><section className="paper-panel w-full max-w-2xl rounded-2xl p-5 shadow-[0_26px_70px_rgba(17,45,55,.22)] sm:p-7" role="dialog" aria-modal="true" aria-labelledby="context-title"><div className="flex items-start justify-between gap-4"><div><p className="mono text-[0.64rem] font-bold uppercase tracking-[0.12em] text-[#0c5b73]">Dados do projeto</p><h2 id="context-title" className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-[#263e45]">Campos do contexto</h2><p className="mt-1 text-sm text-[#64767b]">Salvar atualiza o cabeçalho. Cancelar preserva os dados anteriores.</p></div><button onClick={onClose} className="rounded-lg p-2 text-[#52646a] hover:bg-[#eef1ed]" aria-label="Fechar"><X size={18} /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><LabeledInput label="Nome do projeto" value={draft.projectName} onChange={(value) => update("projectName", value)} /><LabeledInput label="Ambiente" value={draft.environment} onChange={(value) => update("environment", value)} /><LabeledInput label="Modelo ou rota" value={draft.model} onChange={(value) => update("model", value)} /><LabeledInput label="Objetivo de qualidade" value={draft.objective} onChange={(value) => update("objective", value)} /></div><div className="mt-6 flex justify-end gap-2"><button onClick={onClose} className="quiet-button">Cancelar</button><button onClick={onSave} className="primary-button"><Check size={15} /> Salvar dados</button></div></section></div>;
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="field-label">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="field-control mt-1.5 h-10 px-3 text-sm" /></label>;
}

function CaseRow({ testCase, onUpdate, onRemove }: { testCase: TestCase; onUpdate: UpdateCase; onRemove: (id: string) => void }) {
  const control = "w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-xs text-[#42575e] outline-none transition hover:border-[#123b49]/14 focus:border-[#0c5b73] focus:bg-white";
  return <tr className={`case-row--${statusClass(testCase.status)} border-b border-[#123b49]/7`}><td className="max-w-[280px] px-4 py-3"><div className="flex gap-2"><span className="mono mt-2 text-[0.62rem] font-semibold text-[#77888d]">{testCase.id}</span><input aria-label={`Nome do cenário ${testCase.id}`} value={testCase.name} onChange={(event) => onUpdate(testCase.id, "name", event.target.value)} className="w-full border-b border-transparent bg-transparent py-1.5 text-sm font-semibold text-[#2a4147] outline-none hover:border-[#123b49]/15 focus:border-[#0c5b73]" /></div></td><td className="px-2 py-3"><select aria-label={`Tipo ${testCase.id}`} value={testCase.kind} onChange={(event) => onUpdate(testCase.id, "kind", event.target.value as CaseKind)} className={control}>{kindOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></td><td className="px-2 py-3"><select aria-label={`Canal ${testCase.id}`} value={testCase.channel} onChange={(event) => onUpdate(testCase.id, "channel", event.target.value as CaseChannel)} className={control}>{channelOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></td><td className="px-2 py-3"><select aria-label={`Prioridade ${testCase.id}`} value={testCase.priority} onChange={(event) => onUpdate(testCase.id, "priority", event.target.value as CasePriority)} className={control}>{priorityOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></td><td className="px-2 py-3"><div className="flex items-center gap-2"><span className={`status-dot status-dot--${statusClass(testCase.status)}`} /><select aria-label={`Situação ${testCase.id}`} value={testCase.status} onChange={(event) => onUpdate(testCase.id, "status", event.target.value as CaseStatus)} className={control}>{statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div></td><td className="px-3 py-3"><input aria-label={`Latência ${testCase.id}`} type="number" min="0" step="0.1" value={testCase.latency} onChange={(event) => onUpdate(testCase.id, "latency", Number(event.target.value) || 0)} className={`${control} mono w-16 text-right`} /></td><td className="px-3 py-3"><input aria-label={`Custo ${testCase.id}`} type="number" min="0" step="0.001" value={testCase.cost} onChange={(event) => onUpdate(testCase.id, "cost", Number(event.target.value) || 0)} className={`${control} mono w-20 text-right`} /></td><td className="px-3 py-3"><input aria-label={`Responsável ${testCase.id}`} value={testCase.owner} onChange={(event) => onUpdate(testCase.id, "owner", event.target.value)} className={`${control} min-w-28`} /></td><td className="px-3 py-3"><span className="mono text-[0.63rem] text-[#728187]">{testCase.updatedAt}</span></td><td className="px-2 py-3"><button onClick={() => onRemove(testCase.id)} className="rounded-md p-2 text-[#9a625c] hover:bg-[#feeae7]" aria-label={`Excluir ${testCase.id}`}><Trash2 size={15} /></button></td></tr>;
}

function MetricCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: ReactNode }) {
  return <article className="metric-cell p-5"><div className="flex items-start justify-between gap-3"><div><p className="mono text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[#6e7e83]">{label}</p><p className="mt-2 text-3xl font-extrabold tracking-[-0.06em] text-[#264149]">{value}</p></div><span className="rounded-lg bg-[#e2eff0] p-2 text-[#0c5b73]">{icon}</span></div><p className="mt-2 text-xs text-[#6c7d82]">{detail}</p></article>;
}
