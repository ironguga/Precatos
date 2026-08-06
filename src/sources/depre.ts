/**
 * Scraper mensal da ordem cronológica da DEPRE (TJSP).
 *
 * Fluxo:
 *   1. Baixa a página configurada em DEPRE_LIST_URL e descobre links
 *      para planilhas (.xlsx/.xls) — a DEPRE publica a ordem cronológica
 *      por ente devedor nesses arquivos.
 *   2. Baixa cada planilha de interesse e localiza a linha de cabeçalho
 *      por heurística (procura colunas como "ordem", "processo", "valor").
 *   3. Grava cada linha em `depre_entries` (dedupe por mês+ente+processo)
 *      e promove a `targets` as entradas acima do valor mínimo.
 *
 * O layout das planilhas da DEPRE muda de tempos em tempos; as heurísticas
 * de MAPA_COLUNAS abaixo são o ponto de calibração quando isso acontecer.
 */

import * as XLSX from "xlsx";
import { DEPRE_ENTES_INTERESSE, DEPRE_VALOR_MINIMO } from "../config";
import { extrairCNJ, normalizarCNJ, parseValorBR } from "../lib/cnj";
import { Supabase } from "../lib/supabase";
import type { DepreEntry, RunResult, Target } from "../types";

/** Sinônimos aceitos para cada campo no cabeçalho da planilha (comparação sem acento, minúscula). */
const MAPA_COLUNAS: Record<string, string[]> = {
  ordem: ["ordem", "posicao", "posição", "nº ordem", "no ordem", "ordem cronologica"],
  numero_processo: ["processo", "numero do processo", "nº processo", "no processo", "precatorio", "requisitorio"],
  natureza: ["natureza", "natureza do credito", "tipo"],
  valor: ["valor", "valor atualizado", "valor do precatorio", "valor requisitado", "valor historico"],
  ano_orcamento: ["ano", "orcamento", "ano orcamentario", "exercicio", "ano de orcamento"],
  credor: ["credor", "requerente", "beneficiario", "nome do credor"],
};

function semAcento(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

interface LinkPlanilha {
  url: string;
  rotulo: string;
}

/** Extrai da página da DEPRE os links para planilhas. */
export function descobrirPlanilhas(html: string, baseUrl: string): LinkPlanilha[] {
  const links: LinkPlanilha[] = [];
  const re = /<a\b[^>]*href="([^"]+\.(?:xlsx?|XLSX?))"[^>]*>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const url = new URL(m[1], baseUrl).toString();
    const rotulo = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    links.push({ url, rotulo });
  }
  return links;
}

function ehEnteDeInteresse(rotulo: string): boolean {
  if (DEPRE_ENTES_INTERESSE.length === 0) return true;
  const alvo = semAcento(rotulo);
  return DEPRE_ENTES_INTERESSE.some((e) => alvo.includes(semAcento(e)));
}

/** Localiza a linha de cabeçalho e devolve o índice de coluna de cada campo conhecido. */
function mapearCabecalho(linhas: unknown[][]): { headerRow: number; colunas: Record<string, number> } | null {
  for (let i = 0; i < Math.min(linhas.length, 30); i++) {
    const celulas = linhas[i].map((c) => (typeof c === "string" ? semAcento(c) : ""));
    const colunas: Record<string, number> = {};
    for (const [campo, sinonimos] of Object.entries(MAPA_COLUNAS)) {
      const idx = celulas.findIndex((c) => c && sinonimos.some((s) => c === semAcento(s) || c.includes(semAcento(s))));
      if (idx >= 0) colunas[campo] = idx;
    }
    // cabeçalho plausível: achou pelo menos processo + (ordem ou valor)
    if ("numero_processo" in colunas && ("ordem" in colunas || "valor" in colunas)) {
      return { headerRow: i, colunas };
    }
  }
  return null;
}

export function parsePlanilha(buffer: ArrayBuffer, ente: string, snapshotMes: string, arquivo: string): DepreEntry[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const entradas: DepreEntry[] = [];
  for (const nomeAba of wb.SheetNames) {
    const aba = wb.Sheets[nomeAba];
    const linhas = XLSX.utils.sheet_to_json<unknown[]>(aba, { header: 1, defval: null });
    const mapa = mapearCabecalho(linhas);
    if (!mapa) continue;
    const { headerRow, colunas } = mapa;
    for (let i = headerRow + 1; i < linhas.length; i++) {
      const linha = linhas[i];
      const bruta = String(linha[colunas.numero_processo] ?? "");
      const numero = normalizarCNJ(bruta) ?? extrairCNJ(bruta)?.digitos ?? null;
      if (!numero) continue;
      const ordemBruta = colunas.ordem != null ? linha[colunas.ordem] : null;
      const anoBruto = colunas.ano_orcamento != null ? linha[colunas.ano_orcamento] : null;
      entradas.push({
        snapshot_mes: snapshotMes,
        ente_devedor: ente,
        ordem: typeof ordemBruta === "number" ? ordemBruta : parseInt(String(ordemBruta ?? ""), 10) || null,
        numero_processo: numero,
        natureza: colunas.natureza != null ? String(linha[colunas.natureza] ?? "").trim() || null : null,
        valor: colunas.valor != null ? parseValorBR(linha[colunas.valor]) : null,
        ano_orcamento: typeof anoBruto === "number" ? anoBruto : parseInt(String(anoBruto ?? ""), 10) || null,
        arquivo_origem: arquivo,
        raw: {
          aba: nomeAba,
          credor: colunas.credor != null ? linha[colunas.credor] : null,
        },
      });
    }
  }
  return entradas;
}

export async function runDepre(sb: Supabase, listUrl: string): Promise<RunResult> {
  const agora = new Date();
  const snapshotMes = `${agora.getUTCFullYear()}-${String(agora.getUTCMonth() + 1).padStart(2, "0")}-01`;

  const resPagina = await fetch(listUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; precatos-captacao/0.1)" },
  });
  if (!resPagina.ok) {
    throw new Error(`DEPRE: falha ao baixar a página de listas (${listUrl}): HTTP ${resPagina.status}`);
  }
  const html = await resPagina.text();
  const planilhas = descobrirPlanilhas(html, listUrl).filter((p) => ehEnteDeInteresse(p.rotulo));

  let totalEntradas = 0;
  let entradasNovas = 0;
  const porPlanilha: Record<string, number | string> = {};

  for (const planilha of planilhas) {
    try {
      const resArq = await fetch(planilha.url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; precatos-captacao/0.1)" },
      });
      if (!resArq.ok) {
        porPlanilha[planilha.rotulo] = `HTTP ${resArq.status}`;
        continue;
      }
      const buffer = await resArq.arrayBuffer();
      const entradas = parsePlanilha(buffer, planilha.rotulo, snapshotMes, planilha.url);
      totalEntradas += entradas.length;
      porPlanilha[planilha.rotulo] = entradas.length;

      // grava em lotes para não estourar o limite de payload do PostgREST
      for (let i = 0; i < entradas.length; i += 500) {
        entradasNovas += await sb.upsert(
          "depre_entries",
          entradas.slice(i, i + 500),
          "snapshot_mes,ente_devedor,numero_processo",
          true,
        );
      }

      // promove a alvo o que passar do valor mínimo
      const alvos: Target[] = entradas
        .filter((e) => (e.valor ?? 0) >= DEPRE_VALOR_MINIMO)
        .map((e) => ({
          numero_processo: e.numero_processo!,
          fonte: "depre" as const,
          ente_devedor: e.ente_devedor,
          natureza: e.natureza,
          valor: e.valor,
          posicao_fila: e.ordem,
          ano_orcamento: e.ano_orcamento,
          raw: { arquivo: e.arquivo_origem, snapshot: e.snapshot_mes },
        }));
      for (let i = 0; i < alvos.length; i += 500) {
        await sb.upsert("targets", alvos.slice(i, i + 500), "numero_processo", true);
      }
    } catch (err) {
      porPlanilha[planilha.rotulo] = `erro: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  return {
    fonte: "depre",
    ok: true,
    itens_novos: entradasNovas,
    detalhes: {
      snapshot_mes: snapshotMes,
      planilhas_encontradas: planilhas.length,
      total_entradas: totalEntradas,
      por_planilha: porPlanilha,
    },
  };
}
