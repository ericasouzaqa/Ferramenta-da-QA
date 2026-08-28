/**
 * Design philosophy — Caderno de Evidências:
 * app-related guidance must be clearly separated into source evidence and
 * operational suggestions. A requirement never becomes a platform fact by inference.
 */
import { OrganizedQaMaterial } from "./qa-organizer";

export type MobileTool = "Appium" | "Maestro" | "BrowserStack";

export type AppAssessment = {
  isAppRelated: boolean;
  platforms: string[];
  evidence: string[];
  sourceTests: Array<{ title: string; source: string; check: string; status: "pronto" | "a confirmar" }>;
};

const appTerms = /\b(aplicativo|app\b|mobile|m[oó]vel|android|ios|iphone|ipad|apk|aab|ipa|testflight|play\s*store|push|notifica(?:ç|c)[aã]o|deep\s*link|permiss[aã]o|c[aâ]mera|geolocaliza(?:ç|c)[aã]o|biometria)\b/i;
const platformMatchers: Array<[string, RegExp]> = [
  ["Android", /\b(android|apk|aab|play\s*store)\b/i],
  ["iOS", /\b(ios|iphone|ipad|ipa|testflight)\b/i],
  ["Móvel sem plataforma informada", /\b(aplicativo|app\b|mobile|m[oó]vel)\b/i],
];

export function assessAppRequirements(source: string, material: OrganizedQaMaterial | null): AppAssessment {
  const lines = source
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const evidence = lines.filter((line) => appTerms.test(line));
  const platforms = platformMatchers.filter(([, matcher]) => evidence.some((line) => matcher.test(line))).map(([label]) => label);
  const sourceTests = (material?.scenarios ?? []).map((scenario) => ({
    title: scenario.title,
    source: scenario.source,
    check: scenario.check,
    status: scenario.status,
  }));

  return { isAppRelated: evidence.length > 0, platforms, evidence, sourceTests };
}

export function configurationSteps(tool: MobileTool, platforms: string[]): string[] {
  const explicitPlatforms = platforms.filter((platform) => platform === "Android" || platform === "iOS");
  const platformNote = explicitPlatforms.length ? `Plataforma identificada no texto: ${explicitPlatforms.join(" e ")}.` : "A plataforma não foi informada no texto; confirme Android, iOS ou ambas antes de configurar.";
  const shared = [
    platformNote,
    "Use uma compilação de teste do aplicativo e um dispositivo ou emulador dedicado à validação.",
    "Registre os identificadores técnicos necessários (pacote/atividade no Android ou bundleId no iOS) fora do requisito, caso não estejam descritos na fonte.",
    "Configure dados de teste e credenciais sem substituir o que o requisito define como comportamento esperado.",
  ];

  if (tool === "Appium") {
    return [
      "Instale o Appium e o driver correspondente à plataforma validada.",
      ...shared,
      "Aponte a sessão para o dispositivo escolhido e informe o artefato de teste (APK, AAB ou IPA) quando aplicável.",
      "Mantenha os seletores de tela sob controle de versão e associe cada fluxo automatizado ao cenário derivado da fonte.",
    ];
  }

  if (tool === "Maestro") {
    return [
      "Instale o Maestro no ambiente de QA e defina o identificador do aplicativo no fluxo de teste.",
      ...shared,
      "Crie um fluxo YAML por cenário, mantendo o texto de origem como referência da validação.",
      "Execute primeiro em emulador e depois no dispositivo definido pela equipe, caso o requisito exija comportamento de aparelho real.",
    ];
  }

  return [
    "Crie um projeto no BrowserStack e conecte apenas os dispositivos e credenciais autorizados pela equipe.",
    ...shared,
    "Envie a compilação de teste somente pelo canal autorizado e selecione os dispositivos que a equipe definiu como cobertura.",
    "Vincule cada execução ao cenário de fonte; não transforme a matriz de dispositivos em requisito funcional sem evidência no material.",
  ];
}

export function recommendMobileTool(source: string, platforms: string[]): MobileTool {
  if (/\bbrowserstack\b/i.test(source)) return "BrowserStack";
  if (platforms.includes("Android") && platforms.includes("iOS")) return "Appium";
  return "Maestro";
}
