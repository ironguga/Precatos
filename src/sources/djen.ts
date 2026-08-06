/**
 * Monitor do DJEN via API Comunica (CNJ).
 *
 * Endpoint público: https://comunicaapi.pje.jus.br/api/v1/comunicacao
 * Varre diariamente as publicações do tribunal-alvo com os termos
 * configurados e grava:
 *   - a comunicação bruta em `djen_comunicacoes` (dedupe por djen_id)
 *   - o alvo consolidado em `targets` (dedupe por numero_processo)
 *
 * ATENÇÃO: o CloudFront na frente da API bloqueia IPs fora do Brasil.
 * Se o Worker for atendido por um PoP fora do país, a chamada retorna
 * HTML 403 do CloudFront — tratado aqui como erro explícito de geobloqueio.
 */

import { DJEN_JANELA_DIAS, FILTRO_TEXTO, TERMOS_DJEN, TERMOS_DJEN_NIVEL2, TRIBUNAL_ALVO } from "../config";
import { extrairCNJ, normalizarCNJ } from "../lib/cnj";
import { Supabase } from "../lib/supabase";
import type { DjenComunicacao, RunResult, Target } from "../types";

const API_BASE = "https://comunicaapi.pje.jus.br/api/v1/comunicacao";
const ITENS_POR_PAGINA = 100;
const MAX_PAGINAS_POR_TERMO = 20;

/** Item da API Comunica. Os nomes de campo variam entre versões — cobrimos as variantes conhecidas. */
interface ComunicaItem {
  id?: number | string;
  hash?: string;
  data_disponibilizacao?: string;
  dataDisponibilizacao?: string;
  siglaTribunal?: string;
  sigla_tribunal?: string;
  tipoComunicacao?: string;
  tipo_comunicacao?: string;
  nomeOrgao?: string;
  nome_orgao?: string;
  texto?: string;
  numero_processo?: string;
  numeroProcesso?: string;
  numeroprocessocommascara?: string;
  link?: string;
  destinatarios?: unknown;
  destinatarioadvogados?: unknown;
  [k: string]: unknown;
}

interface ComunicaResponse {
  count?: number;
  items?: ComunicaItem[];
  [k: string]: unknown;
}

function dataISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function passaFiltroTexto(texto: string): boolean {
  const mantem = FILTRO_TEXTO.manter.some((re) => re.test(texto));
  const descarta = FILTRO_TEXTO.descartar.some((re) => re.test(texto));
  return mantem && !descarta;
}

async function buscarTermo(termo: string, inicio: string, fim: string): Promise<ComunicaItem[]> {
  const itens: ComunicaItem[] = [];
  for (let pagina = 1; pagina <= MAX_PAGINAS_POR_TERMO; pagina++) {
    const params = new URLSearchParams({
      pagina: String(pagina),
      itensPorPagina: String(ITENS_POR_PAGINA),
      siglaTribunal: TRIBUNAL_ALVO,
      dataDisponibilizacaoInicio: inicio,
      dataDisponibilizacaoFim: fim,
      texto: termo,
    });
    const res = await fetch(`${API_BASE}?${params}`, {
      headers: { Accept: "application/json", "User-Agent": "precatos-captacao/0.1" },
    });
    const contentType = res.headers.get("content-type") ?? "";
    if (!res.ok || !contentType.includes("json")) {
      const corpoCompleto = await res.text();
      const corpo = corpoCompleto.slice(0, 300);
      const pareceGeobloqueio =
        /cloudfront/i.test(corpoCompleto) || corpoCompleto.includes("block access from your country");
      if (res.status === 403 && pareceGeobloqueio) {
        throw new Error(
          "API Comunica bloqueou a requisição (geobloqueio CloudFront — IP fora do Brasil). " +
            "Ver README, seção 'Geobloqueio'.",
        );
      }
      throw new Error(`API Comunica: HTTP ${res.status} para termo "${termo}": ${corpo}`);
    }
    const data = (await res.json()) as ComunicaResponse;
    const pageItems = data.items ?? [];
    itens.push(...pageItems);
    if (pageItems.length < ITENS_POR_PAGINA) break;
  }
  return itens;
}

function itemParaLinha(item: ComunicaItem, termo: string): DjenComunicacao | null {
  const id = item.id ?? item.hash;
  if (id == null) return null;
  const numeroBruto = item.numero_processo ?? item.numeroProcesso ?? item.numeroprocessocommascara ?? null;
  const numero = normalizarCNJ(numeroBruto) ?? extrairCNJ(item.texto)?.digitos ?? null;
  return {
    djen_id: String(id),
    hash: item.hash ?? null,
    numero_processo: numero,
    data_disponibilizacao: item.data_disponibilizacao ?? item.dataDisponibilizacao ?? null,
    sigla_tribunal: item.siglaTribunal ?? item.sigla_tribunal ?? TRIBUNAL_ALVO,
    tipo_comunicacao: item.tipoComunicacao ?? item.tipo_comunicacao ?? null,
    orgao: item.nomeOrgao ?? item.nome_orgao ?? null,
    termo_busca: termo,
    texto: item.texto ?? null,
    link: item.link ?? null,
    destinatarios: item.destinatarios ?? null,
    advogados: item.destinatarioadvogados ?? null,
  };
}

/** Extrai nome/OAB do primeiro advogado destinatário, cobrindo as variantes de shape da API. */
function extrairAdvogado(advogados: unknown): { nome: string | null; oab: string | null } {
  if (!Array.isArray(advogados) || advogados.length === 0) return { nome: null, oab: null };
  const primeiro = advogados[0] as Record<string, unknown>;
  const adv = (primeiro.advogado ?? primeiro) as Record<string, unknown>;
  const nome = typeof adv.nome === "string" ? adv.nome : null;
  const numero = adv.numero_oab ?? adv.numeroOab;
  const uf = adv.uf_oab ?? adv.ufOab;
  const oab = numero != null ? `${numero}${uf ? `/${uf}` : ""}` : null;
  return { nome, oab };
}

function extrairCredor(destinatarios: unknown): string | null {
  if (!Array.isArray(destinatarios)) return null;
  for (const d of destinatarios) {
    const dest = d as Record<string, unknown>;
    // polo "A" (ativo) = credor; sem polo, usa o primeiro nome disponível
    if (typeof dest.nome === "string" && (dest.polo === "A" || dest.polo == null)) return dest.nome;
  }
  return null;
}

export async function runDjen(sb: Supabase): Promise<RunResult> {
  const fim = new Date();
  const inicio = new Date(fim.getTime() - DJEN_JANELA_DIAS * 24 * 60 * 60 * 1000);
  const termos = [...TERMOS_DJEN, ...TERMOS_DJEN_NIVEL2];

  const porTermo: Record<string, number> = {};
  const linhas = new Map<string, DjenComunicacao>();

  for (const termo of termos) {
    const itens = await buscarTermo(termo, dataISO(inicio), dataISO(fim));
    porTermo[termo] = itens.length;
    for (const item of itens) {
      const linha = itemParaLinha(item, termo);
      if (!linha) continue;
      if (linha.texto && !passaFiltroTexto(linha.texto)) continue;
      if (!linhas.has(linha.djen_id)) linhas.set(linha.djen_id, linha);
    }
  }

  const comunicacoes = [...linhas.values()];
  const novasComunicacoes = await sb.upsert("djen_comunicacoes", comunicacoes, "djen_id", true);

  // Consolida alvos: um por processo, mantendo o que já existe (ignore-duplicates
  // preserva primeira_deteccao e o trabalho manual de pipeline já feito).
  const alvos = new Map<string, Target>();
  for (const c of comunicacoes) {
    if (!c.numero_processo || alvos.has(c.numero_processo)) continue;
    const { nome, oab } = extrairAdvogado(c.advogados);
    alvos.set(c.numero_processo, {
      numero_processo: c.numero_processo,
      tribunal: c.sigla_tribunal ?? TRIBUNAL_ALVO,
      fonte: "djen",
      credor: extrairCredor(c.destinatarios),
      advogado_nome: nome,
      advogado_oab: oab,
      raw: { djen_id: c.djen_id, termo: c.termo_busca, link: c.link },
    });
  }
  const novosAlvos = await sb.upsert("targets", [...alvos.values()], "numero_processo", true);

  return {
    fonte: "djen",
    ok: true,
    itens_novos: novasComunicacoes,
    detalhes: {
      janela: { inicio: dataISO(inicio), fim: dataISO(fim) },
      resultados_por_termo: porTermo,
      comunicacoes_apos_filtro: comunicacoes.length,
      comunicacoes_novas: novasComunicacoes,
      alvos_novos: novosAlvos,
    },
  };
}
