#!/usr/bin/env node
/**
 * Lista as descrições-filhas de uma descrição do Archeevo do ABM.
 *
 * O levantamento por identificadores só apanha o que estiver dentro do
 * intervalo varrido. As séries-mãe (ex.: PT/ABM/PPTS03/002, «Registo de
 * casamentos da Ponta do Sol 1565-1911», ID 51147) apontam para os volumes,
 * e é por aí que se chega aos livros cujo ID está fora do intervalo.
 *
 * A forma do endpoint varia entre versões do Archeevo, por isso tento
 * várias e fico pela primeira que responda.
 */
const origem = 'https://arquivo-abm.madeira.gov.pt';
const H = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

const alvos = process.argv.slice(2);
if (!alvos.length) {
  console.error('uso: node arquivo-abm-filhos.mjs <id> [<id>…]');
  process.exit(1);
}

const formas = (id) => [
  `/api/descriptions/${id}/children`,
  `/api/descriptions/${id}/childs`,
  `/api/descriptions/${id}/descendants`,
  `/api/descriptions/children?parentId=${id}`,
  `/api/descriptions/tree?id=${id}`,
  `/api/descriptions/${id}/tree`,
  `/api/descriptions?parent=${id}`,
];

async function tentar(url) {
  try {
    const res = await fetch(origem + url, { headers: H });
    if (!res.ok) return { url, estado: res.status };
    const txt = await res.text();
    let dados;
    try { dados = JSON.parse(txt); } catch { return { url, estado: 'não-json', amostra: txt.slice(0, 120) }; }
    return { url, estado: 200, dados };
  } catch (e) {
    return { url, estado: String(e).slice(0, 60) };
  }
}

/** Extrai (id, código, título, datas) de qualquer forma de JSON. */
function extrair(no, saida = []) {
  if (Array.isArray(no)) { no.forEach((x) => extrair(x, saida)); return saida; }
  if (!no || typeof no !== 'object') return saida;
  const id = no.Id ?? no.ID ?? no.DescriptionId ?? no.id;
  const cod = no.CompleteUnitId ?? no.Code ?? no.ReferenceCode;
  const tit = no.UnitTitle ?? no.Title ?? no.Name;
  if (id && (cod || tit))
    saida.push({
      id,
      cod: cod ?? '',
      tit: tit ?? '',
      ini: String(no.UnitDateInitial ?? '').slice(0, 10),
      fim: String(no.UnitDateFinal ?? '').slice(0, 10),
    });
  Object.values(no).forEach((v) => extrair(v, saida));
  return saida;
}

for (const id of alvos) {
  const pai = await tentar(`/api/descriptions/${id}`);
  console.log(`\n===== descrição ${id} =====`);
  if (pai.estado === 200 && pai.dados)
    console.log(`  ${pai.dados.CompleteUnitId ?? '?'}  ${pai.dados.UnitTitle ?? ''}`);
  for (const forma of formas(id)) {
    const r = await tentar(forma);
    if (r.estado !== 200) { console.log(`  ${forma} -> ${r.estado}`); continue; }
    const filhos = extrair(r.dados);
    const unicos = [...new Map(filhos.map((f) => [f.id, f])).values()];
    console.log(`  ${forma} -> 200, ${unicos.length} entradas`);
    for (const f of unicos.slice(0, 120))
      console.log(`      ${String(f.id).padStart(7)}  ${String(f.cod).padEnd(30)} ${f.ini}..${f.fim}  ${f.tit}`);
    if (unicos.length) break;
  }
}
