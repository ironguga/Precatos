/**
 * Worker de captação — módulo 1 da plataforma de originação de precatórios.
 *
 * Gatilhos cron (wrangler.toml):
 *   "0 9 * * *"  — varredura diária do DJEN (API Comunica/CNJ)
 *   "0 12 2 * *" — coleta mensal da ordem cronológica da DEPRE
 *
 * Endpoints HTTP (autenticados via Bearer ADMIN_TOKEN):
 *   GET  /status     — últimos runs registrados
 *   POST /run/djen   — dispara a varredura do DJEN manualmente
 *   POST /run/depre  — dispara a coleta da DEPRE manualmente
 */

import { Supabase } from "./lib/supabase";
import { runDepre } from "./sources/depre";
import { runDjen } from "./sources/djen";
import type { Env, RunResult } from "./types";

const CRON_DJEN = "0 9 * * *";
const CRON_DEPRE = "0 12 2 * *";

async function executar(fonte: "djen" | "depre", env: Env): Promise<RunResult> {
  const sb = new Supabase(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const iniciado = new Date().toISOString();
  let resultado: RunResult;
  try {
    resultado = fonte === "djen" ? await runDjen(sb) : await runDepre(sb, env.DEPRE_LIST_URL);
  } catch (err) {
    resultado = {
      fonte,
      ok: false,
      itens_novos: 0,
      detalhes: { erro: err instanceof Error ? err.message : String(err) },
    };
  }
  try {
    await sb.insert("runs", [
      {
        fonte,
        iniciado_em: iniciado,
        finalizado_em: new Date().toISOString(),
        ok: resultado.ok,
        itens_novos: resultado.itens_novos,
        detalhes: resultado.detalhes,
      },
    ]);
  } catch (err) {
    console.error("falha ao registrar run:", err);
  }
  if (!resultado.ok) console.error(`run ${fonte} falhou:`, resultado.detalhes);
  return resultado;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function autorizado(req: Request, env: Env): boolean {
  const auth = req.headers.get("Authorization") ?? "";
  return Boolean(env.ADMIN_TOKEN) && auth === `Bearer ${env.ADMIN_TOKEN}`;
}

export default {
  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    if (event.cron === CRON_DJEN) ctx.waitUntil(executar("djen", env));
    else if (event.cron === CRON_DEPRE) ctx.waitUntil(executar("depre", env));
    else console.warn("cron desconhecido:", event.cron);
  },

  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (!autorizado(req, env)) return json({ erro: "não autorizado" }, 401);

    if (req.method === "GET" && url.pathname === "/status") {
      const sb = new Supabase(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
      const runs = await sb.select("runs", "select=*&order=iniciado_em.desc&limit=20");
      return json({ runs });
    }
    if (req.method === "POST" && url.pathname === "/run/djen") {
      return json(await executar("djen", env));
    }
    if (req.method === "POST" && url.pathname === "/run/depre") {
      return json(await executar("depre", env));
    }
    return json({ erro: "rota desconhecida" }, 404);
  },
} satisfies ExportedHandler<Env>;
