/** Utilidades para números de processo no padrão CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO). */

const RE_CNJ_MASCARA = /\b(\d{7})-(\d{2})\.(\d{4})\.(\d)\.(\d{2})\.(\d{4})\b/;

/** Remove tudo que não for dígito. Um número CNJ completo tem 20 dígitos. */
export function normalizarCNJ(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const digitos = valor.replace(/\D/g, "");
  return digitos.length === 20 ? digitos : null;
}

/** Extrai o primeiro número CNJ (com máscara) encontrado em um texto. */
export function extrairCNJ(texto: string | null | undefined): { mascara: string; digitos: string } | null {
  if (!texto) return null;
  const m = RE_CNJ_MASCARA.exec(texto);
  if (!m) return null;
  const mascara = m[0];
  const digitos = mascara.replace(/\D/g, "");
  return { mascara, digitos };
}

/** Aplica a máscara CNJ a um número de 20 dígitos. */
export function formatarCNJ(digitos: string): string | null {
  if (!/^\d{20}$/.test(digitos)) return null;
  return `${digitos.slice(0, 7)}-${digitos.slice(7, 9)}.${digitos.slice(9, 13)}.${digitos.slice(13, 14)}.${digitos.slice(14, 16)}.${digitos.slice(16, 20)}`;
}

/**
 * Converte valores monetários brasileiros ("1.234.567,89", "R$ 1.234,56")
 * para number. Retorna null se não reconhecer.
 */
export function parseValorBR(valor: unknown): number | null {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  if (typeof valor !== "string") return null;
  const limpo = valor.replace(/[R$\s]/g, "");
  if (!limpo) return null;
  // formato BR: pontos de milhar e vírgula decimal
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(limpo)) {
    return parseFloat(limpo.replace(/\./g, "").replace(",", "."));
  }
  // formato já em ponto decimal
  if (/^\d+(\.\d+)?$/.test(limpo)) return parseFloat(limpo);
  return null;
}
