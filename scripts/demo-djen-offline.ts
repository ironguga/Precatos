/**
 * Teste de integração OFFLINE do coletor DJEN.
 *
 * Roda o código REAL de src/sources/djen.ts (parsing, filtro anti-RPV, dedupe,
 * consolidação de alvos, gravação no Supabase) — mas substitui a chamada de
 * rede à API Comunica por uma resposta sintética. Serve para validar todo o
 * pipeline sem depender da rede do CNJ (que geobloqueia IPs fora do Brasil).
 *
 * Uso: npm run demo:djen   (requer Supabase local no ar: npm run db:start)
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { Supabase } from "../src/lib/supabase";
import { runDjen } from "../src/sources/djen";

// --- carrega .dev.vars (mesma lógica do run-local) ---
const caminho = resolve(import.meta.dirname, "..", ".dev.vars");
if (existsSync(caminho)) {
  for (const linha of readFileSync(caminho, "utf-8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(linha);
    if (m && !linha.trimStart().startsWith("#") && process.env[m[1]] == null) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

// --- fixture: formato da API Comunica (2 precatórios + 1 RPV que deve ser filtrado) ---
const ITENS = [
  {
    id: 900001,
    numero_processo: "1002345-67.2024.8.26.0053",
    data_disponibilizacao: "2026-08-05",
    siglaTribunal: "TJSP",
    tipoComunicacao: "Intimação",
    nomeOrgao: "Vara da Fazenda Pública",
    texto:
      "Expedido ofício requisitório referente ao precatório em face da Fazenda do Estado de São Paulo. " +
      "Natureza comum. Intime-se a parte credora na pessoa de seu advogado.",
    destinatarios: [{ nome: "MARIA APARECIDA DE SOUZA", polo: "A" }],
    destinatarioadvogados: [{ advogado: { nome: "JOÃO CARLOS PEREIRA", numero_oab: "123456", uf_oab: "SP" } }],
    link: "https://comunica.pje.jus.br/consulta/900001",
  },
  {
    id: 900002,
    numero_processo: "1009876-54.2023.8.26.0053",
    data_disponibilizacao: "2026-08-05",
    siglaTribunal: "TJSP",
    tipoComunicacao: "Intimação",
    nomeOrgao: "Vara da Fazenda Pública",
    texto:
      "Requisição de pequeno valor (RPV) expedida em face da Fazenda do Estado. " +
      "Aguarde-se o pagamento na forma da lei.",
    destinatarios: [{ nome: "ANTONIO DOS SANTOS", polo: "A" }],
    destinatarioadvogados: [{ advogado: { nome: "PAULA LIMA", numero_oab: "654321", uf_oab: "SP" } }],
    link: "https://comunica.pje.jus.br/consulta/900002",
  },
  {
    // duplicata do primeiro (mesmo id) para provar o dedupe
    id: 900001,
    numero_processo: "1002345-67.2024.8.26.0053",
    data_disponibilizacao: "2026-08-05",
    siglaTribunal: "TJSP",
    texto: "Expedição de precatório — republicação.",
    destinatarioadvogados: [{ advogado: { nome: "JOÃO CARLOS PEREIRA", numero_oab: "123456", uf_oab: "SP" } }],
  },
];

// --- intercepta o fetch: só responde ao host da API Comunica ---
const fetchReal = globalThis.fetch;
globalThis.fetch = (async (input: any, init?: any) => {
  const url = typeof input === "string" ? input : input.url;
  if (url.includes("comunicaapi.pje.jus.br")) {
    // primeira página devolve os itens; próximas páginas vazias (encerra a paginação)
    const pagina = new URL(url).searchParams.get("pagina");
    const body = JSON.stringify({ count: ITENS.length, items: pagina === "1" ? ITENS : [] });
    return new Response(body, { status: 200, headers: { "content-type": "application/json" } });
  }
  return fetchReal(input, init);
}) as typeof fetch;

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Faltam SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY. Rode: npm run db:start");
    process.exit(1);
  }
  const sb = new Supabase(url, key);

  console.log("Rodando runDjen() com resposta sintética da API Comunica...\n");
  const iniciado = new Date().toISOString();
  const resultado = await runDjen(sb);
  await sb.insert("runs", [
    {
      fonte: resultado.fonte,
      iniciado_em: iniciado,
      finalizado_em: new Date().toISOString(),
      ok: resultado.ok,
      itens_novos: resultado.itens_novos,
      detalhes: { ...resultado.detalhes, executor: "demo-offline" },
    },
  ]);
  console.log("resultado do run:", JSON.stringify(resultado, null, 2));

  const alvos = await sb.select<Record<string, unknown>>(
    "targets",
    "select=numero_processo,credor,advogado_nome,advogado_oab,fonte,status&order=primeira_deteccao.desc",
  );
  console.log("\nalvos gravados em `targets`:", JSON.stringify(alvos, null, 2));

  const ok =
    resultado.ok &&
    alvos.length === 1 && // só 1: o RPV foi filtrado e a duplicata deduplicada
    alvos[0].numero_processo === "10023456720248260053" &&
    alvos[0].advogado_nome === "JOÃO CARLOS PEREIRA";
  console.log(ok ? "\n✅ PIPELINE OK: RPV filtrado, duplicata deduplicada, advogado extraído." : "\n❌ resultado inesperado.");
  process.exit(ok ? 0 : 2);
}

main().catch((e) => {
  console.error("erro:", e);
  process.exit(1);
});
