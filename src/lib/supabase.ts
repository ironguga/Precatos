/**
 * Cliente mínimo do Supabase via PostgREST (fetch puro — sem SDK,
 * para manter o bundle do Worker enxuto).
 */

export class SupabaseError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string,
  ) {
    super(message);
  }
}

export class Supabase {
  constructor(
    private readonly url: string,
    private readonly serviceRoleKey: string,
  ) {}

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      apikey: this.serviceRoleKey,
      Authorization: `Bearer ${this.serviceRoleKey}`,
      "Content-Type": "application/json",
      ...extra,
    };
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const res = await fetch(`${this.url}/rest/v1/${path}`, init);
    if (!res.ok) {
      const body = await res.text();
      throw new SupabaseError(`Supabase ${init.method} ${path} -> ${res.status}`, res.status, body);
    }
    return res;
  }

  /**
   * Upsert com resolução de conflito pela(s) coluna(s) `onConflict`.
   * `ignoreDuplicates=true` insere só o que for novo (não sobrescreve).
   * Retorna o número de linhas retornadas pelo PostgREST.
   */
  async upsert(table: string, rows: unknown[], onConflict: string, ignoreDuplicates = false): Promise<number> {
    if (rows.length === 0) return 0;
    const resolution = ignoreDuplicates ? "ignore-duplicates" : "merge-duplicates";
    const res = await this.request(`${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
      method: "POST",
      headers: this.headers({ Prefer: `resolution=${resolution},return=representation` }),
      body: JSON.stringify(rows),
    });
    const data = (await res.json()) as unknown[];
    return Array.isArray(data) ? data.length : 0;
  }

  async insert(table: string, rows: unknown[]): Promise<void> {
    if (rows.length === 0) return;
    await this.request(table, {
      method: "POST",
      headers: this.headers({ Prefer: "return=minimal" }),
      body: JSON.stringify(rows),
    });
  }

  /** SELECT simples. `query` é a query string do PostgREST (ex.: "select=*&limit=10"). */
  async select<T = unknown>(table: string, query: string): Promise<T[]> {
    const res = await this.request(`${table}?${query}`, {
      method: "GET",
      headers: this.headers(),
    });
    return (await res.json()) as T[];
  }
}
