/**
 * Teste de fumaça do parsing (sem rede): CNJ, valores BR e planilha DEPRE sintética.
 * Rodar com: npx tsx scripts/smoke.ts
 */
import * as XLSX from "xlsx";
import { normalizarCNJ, extrairCNJ, formatarCNJ, parseValorBR } from "../src/lib/cnj";
import { parsePlanilha, descobrirPlanilhas } from "../src/sources/depre";

console.log("normalizar:", normalizarCNJ("0123456-78.2020.8.26.0053"));
console.log("extrair:", extrairCNJ("nos autos do processo 0123456-78.2020.8.26.0053, expedido ofício requisitório"));
console.log("formatar:", formatarCNJ("01234567820208260053"));
console.log("valorBR:", parseValorBR("R$ 1.234.567,89"), parseValorBR("750000.50"), parseValorBR("abc"));

const linhas = [
  ["DEPRE - Ordem Cronológica"],
  [],
  ["Ordem", "Nº Processo", "Natureza", "Valor Atualizado", "Ano de Orçamento"],
  [1, "0123456-78.2020.8.26.0053", "Comum", "1.234.567,89", 2026],
  [2, "9876543-21.2019.8.26.0053", "Alimentar", "350.000,00", 2026],
  [3, "sem numero", "Comum", "100,00", 2026],
];
const ws = XLSX.utils.aoa_to_sheet(linhas);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Fazenda");
const buf: ArrayBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
const entradas = parsePlanilha(buf, "Fazenda do Estado de São Paulo", "2026-08-01", "teste.xlsx");
console.log("entradas:", JSON.stringify(entradas, null, 1));

const html = `<a href="/Download/Depre/fazenda_estado.xlsx">Fazenda do Estado</a> <a href="x.pdf">pdf</a>`;
console.log("links:", descobrirPlanilhas(html, "https://www.tjsp.jus.br/Depre"));
