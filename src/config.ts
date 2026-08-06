/**
 * Configuração da captação.
 *
 * TERMOS_DJEN — termos monitorados diariamente no DJEN (API Comunica/CNJ).
 * A ideia do "negociar na frente": detectar o precatório no dia em que nasce,
 * meses antes de aparecer na lista da DEPRE.
 *
 * Nível 2 (TERMOS_DJEN_NIVEL2) — desapropriações em fase final de execução,
 * para chegar antes até da expedição do precatório.
 */

export const TRIBUNAL_ALVO = "TJSP";

export const TERMOS_DJEN: string[] = [
  "ofício requisitório",
  "expedição de precatório",
  "requisitório de pagamento",
];

export const TERMOS_DJEN_NIVEL2: string[] = [
  "desapropriação homologo os cálculos",
  "desapropriação trânsito em julgado da fase de cumprimento",
];

/**
 * Filtros aplicados sobre o texto da comunicação depois da busca
 * (a busca textual da API é ampla; aqui refinamos).
 * Uma comunicação é mantida se casar com QUALQUER regex de `manter`
 * e NENHUMA de `descartar`.
 */
export const FILTRO_TEXTO = {
  manter: [
    /of[íi]cio\s+requisit[óo]rio/i,
    /expedi[çc][ãa]o\s+d[eo]\s+precat[óo]rio/i,
    /requisit[óo]rio\s+de\s+pagamento/i,
    /precat[óo]rio/i,
  ],
  descartar: [
    /requisi[çc][ãa]o\s+de\s+pequeno\s+valor/i, // RPV não é o alvo
    /\bRPV\b/,
  ],
};

/** Valor mínimo (R$) para uma entrada da DEPRE virar alvo automaticamente. */
export const DEPRE_VALOR_MINIMO = 500_000;

/**
 * Entes devedores de interesse na lista da DEPRE (match por substring,
 * caso-insensível). Vazio = todos.
 */
export const DEPRE_ENTES_INTERESSE: string[] = [
  "fazenda do estado",
  "estado de são paulo",
];

/** Janela (em dias) da varredura diária do DJEN, com margem para atrasos. */
export const DJEN_JANELA_DIAS = 3;
