/**
 * Executor local dos coletores — roda na sua máquina, sem Cloudflare.
 *
 * Como o seu IP local é brasileiro, este é o melhor jeito de testar o
 * monitor do DJEN (a API do CNJ geobloqueia IPs de fora do Brasil).
 *
 * Uso:
 *   1. copie .dev.vars.example para .dev.vars e preencha SUPABASE_URL e
 *      SUPABASE_SERVICE_ROLE_KEY (ADMIN_TOKEN não é necessário aqui)
 *   2. npm run local:djen    — varredura do DJEN agora
 *      npm run local:depre   — coleta da DEPRE agora
 *      npm run local:status  — últimas execuções registradas
 *
 * Requer Node 18+ (fetch nativo).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { Supabase } from "../src/lib/supabase";
import { runDjen } from "../src/sources/djen";
import { runDepre } from "../src/sources/depre";

const DEPRE_LIST_URL_PADRAO = "https://www.tjsp.jus.br/Depre";

function carregarDevVars(): void {
  const caminho = resolve(import.meta.dirname, "..", ".dev.vars");
  if (!existsSync(caminho)) return;
  for (const linha of readFileSync(caminho, "utf-8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(linha);
    if (m && !linha.trimStart().startsWith("#") && process.env[m[1]] == null) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

async function main(): Promise<void> {
  carregarDevVars();

  const comando = process.argv[2];
  if (!comando || !["djen", "depre", "status"].includes(comando)) {
    console.error("uso: npx tsx scripts/run-local.ts <djen|depre|status>");
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY.\n" +
        "Copie .dev.vars.example para .dev.vars e preencha, ou exporte como variáveis de ambiente.",
    );
    process.exit(1);
  }
  const sb = new Supabase(url, key);

  if (comando === "status") {
    const runs = await sb.select("runs", "select=*&order=iniciado_em.desc&limit=10");
    console.log(JSON.stringify(runs, null, 2));
    return;
  }

  const iniciado = new Date().toISOString();
  console.log(`[${iniciado}] iniciando coleta: ${comando}`);
  const resultado =
    comando === "djen"
      ? await runDjen(sb)
      : await runDepre(sb, process.env.DEPRE_LIST_URL ?? DEPRE_LIST_URL_PADRAO);

  try {
    await sb.insert("runs", [
      {
        fonte: resultado.fonte,
        iniciado_em: iniciado,
        finalizado_em: new Date().toISOString(),
        ok: resultado.ok,
        itens_novos: resultado.itens_novos,
        detalhes: { ...resultado.detalhes, executor: "local" },
      },
    ]);
  } catch (err) {
    console.error("aviso: falha ao registrar o run no Supabase:", err);
  }

  console.log(JSON.stringify(resultado, null, 2));
  process.exit(resultado.ok ? 0 : 2);
}

main().catch((err) => {
  console.error("erro fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
