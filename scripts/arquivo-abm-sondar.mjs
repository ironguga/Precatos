#!/usr/bin/env node
/**
 * Sonda, livro a livro, o que o ABM tem mesmo digitalizado.
 *
 * O levantamento pelo catálogo diz que uma descrição existe; não diz se tem
 * imagens em linha. Aqui pergunto pelas representações e pelos objectos
 * digitais e conto as páginas que respondem.
 */
const origem = 'https://arquivo-abm.madeira.gov.pt';
const H = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['41111', '42296', '42455', '42493', '42580', '42393', '42119', '41777', '41778'];

async function pega(url) {
  try {
    const r = await fetch(url, { headers: H });
    return { ok: r.ok, estado: r.status, corpo: r.ok ? await r.text() : '' };
  } catch (e) {
    return { ok: false, estado: 0, corpo: String(e.message) };
  }
}

for (const id of ids) {
  const d = await pega(`${origem}/api/descriptions/${id}`);
  let titulo = '?';
  let temRep = '?';
  if (d.ok) {
    try {
      const j = JSON.parse(d.corpo);
      titulo = j.UnitTitle ?? '?';
      temRep = String(j.HasDigitalRepresentation ?? '?');
    } catch {}
  }
  const rep = await pega(`${origem}/api/descriptions/${id}/representations`);
  const obj = await pega(`${origem}/api/descriptions/${id}/digitalobjects`);
  let nos = 0;
  if (rep.ok) {
    try {
      const j = JSON.parse(rep.corpo);
      const conta = (n) => {
        if (!n) return;
        if (Array.isArray(n)) return n.forEach(conta);
        if (n.ID || n.Id) nos++;
        for (const v of Object.values(n)) if (v && typeof v === 'object') conta(v);
      };
      conta(j);
    } catch {}
  }
  const vaults = obj.ok ? (obj.corpo.match(/vault:\/\/DISSEMINATION\//g) || []).length : 0;
  console.log(
    `${id}  digital=${temRep.padEnd(5)} representations=${String(rep.estado).padEnd(3)} nós=${String(nos).padEnd(5)} ` +
      `digitalobjects=${String(obj.estado).padEnd(3)} páginas=${String(vaults).padEnd(5)} ${titulo}`
  );
}
