export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ADMIN_TOKEN: string;
  DEPRE_LIST_URL: string;
}

/** Alvo de originação (linha da tabela `targets`). */
export interface Target {
  numero_processo: string;
  numero_processo_mascara?: string | null;
  tribunal?: string;
  fonte: "djen" | "depre";
  ente_devedor?: string | null;
  natureza?: string | null;
  valor?: number | null;
  credor?: string | null;
  advogado_nome?: string | null;
  advogado_oab?: string | null;
  posicao_fila?: number | null;
  ano_orcamento?: number | null;
  raw?: unknown;
}

/** Comunicação capturada do DJEN (linha da tabela `djen_comunicacoes`). */
export interface DjenComunicacao {
  djen_id: string;
  hash?: string | null;
  numero_processo?: string | null;
  data_disponibilizacao?: string | null;
  sigla_tribunal?: string | null;
  tipo_comunicacao?: string | null;
  orgao?: string | null;
  termo_busca: string;
  texto?: string | null;
  link?: string | null;
  destinatarios?: unknown;
  advogados?: unknown;
}

/** Entrada da ordem cronológica da DEPRE (linha da tabela `depre_entries`). */
export interface DepreEntry {
  snapshot_mes: string; // YYYY-MM-01
  ente_devedor?: string | null;
  ordem?: number | null;
  numero_processo?: string | null;
  natureza?: string | null;
  valor?: number | null;
  ano_orcamento?: number | null;
  arquivo_origem?: string | null;
  raw?: unknown;
}

export interface RunResult {
  fonte: "djen" | "depre";
  ok: boolean;
  itens_novos: number;
  detalhes: Record<string, unknown>;
}
