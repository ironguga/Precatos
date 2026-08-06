# Como o TJSP publica os dados de precatórios — achados da investigação

> Levantamento feito direto contra o site do TJSP (agosto/2026) para calibrar o
> coletor da DEPRE. **Conclusão principal: a suposição inicial do scraper estava
> errada** — o TJSP não publica a ordem cronológica como planilhas `.xlsx`
> soltas numa página. Os dados vivem atrás de um sistema web com CAPTCHA.

## O que existe de verdade

A página `https://www.tjsp.jus.br/Precatorios` é só um portal de navegação
(institucional). Os dados operacionais ficam no sistema **SCP** (GeneXus),
sob `https://www.tjsp.jus.br/cac/scp/*.aspx`. As telas úteis:

| Tela | URL | Conteúdo |
|------|-----|----------|
| Precatórios Pendentes de Pagamento | `webRelPublicLstPagPrecatPendentes.aspx` | A **fila** de pendentes por entidade devedora — o mais próximo da "ordem cronológica" |
| Consulta de Publicações / Dívida Anual | `aPublicacao_ConsultaDividaAnual.aspx` | Listas anuais publicadas por entidade |
| Pagamentos Disponibilizados | `webrelpubliclstpagprecatefetuados.aspx` | O que já foi pago |
| Pesquisa de Precatórios e Pagamentos | `webmenupesquisa.aspx` | Busca individual |

### Como as telas funcionam (SCP / GeneXus)

- Cada tela tem um `<select id="vENT_ID">` com a lista de **entidades devedoras**
  embutida no `GXState` (JSON no HTML). Levantei os IDs relevantes:
  - **`56` = FAZENDA DO ESTADO DE SÃO PAULO** (o nosso alvo principal)
  - `621` = Município de São Paulo, `23` = USP, etc.
  - São ~713 entidades na tela de pendentes e ~994 na de publicações.
- Também há filtro por **tipo** (`vENT_TIPO`): `FE` = Fazenda Estadual,
  `AM` = Autarquia Municipal, `PM` = Prefeitura, etc.
- Para gerar o relatório, o usuário seleciona a entidade e clica em
  "Abrir Relatório" — um **postback GeneXus** (evento `ABRIRRELATORIO`).

### O bloqueio: CAPTCHA

As telas de relatório carregam `Captcha/jcap.js` + `CaptchaRender.js` e o evento
`ABRIRRELATORIO` **exige `CAPTCHA1.ValidationResult`**. Ou seja: não dá para
gerar o relatório com um simples GET/POST — precisa resolver um CAPTCHA a cada
consulta. Isso inviabiliza o scraper HTTP puro que estava no `depre.ts`.

## Implicações para o projeto

1. **O `depre.ts` atual não vai achar nada** — ele procura links `.xlsx` numa
   página, e esses links não existem. Marcado como "precisa reescrever".
2. Reescrita da coleta da DEPRE tem três caminhos possíveis, do mais simples ao
   mais robusto:
   - **(a) Manual assistido** — uma pessoa resolve o CAPTCHA uma vez por
     entidade/mês, e o sistema faz o parse do relatório retornado. Bom para
     começar (poucas entidades de interesse: Fazenda do Estado, no máximo mais
     algumas). É o caminho recomendado para o MVP.
   - **(b) Serviço de resolução de CAPTCHA** (2Captcha/anti-captcha) dirigindo
     um browser headless (Playwright). Automatiza de ponta a ponta, custa
     centavos por consulta, mas é frágil a mudanças do site.
   - **(c) DataJud (API pública do CNJ)** como fonte alternativa de metadados
     processuais — não traz a posição na fila da DEPRE, mas complementa.
3. O **DJEN continua sendo a fonte primária e sem CAPTCHA** — é ele que dá o
   "negociar na frente". A DEPRE vira enriquecimento/confirmação de posição na
   fila, não a porta de entrada.

## Dados já extraídos (prontos para uso)

- Lista completa de entidades devedoras e seus IDs — dá para pré-carregar no
  sistema em vez de raspar toda vez. Ver `docs/depre-entidades.json` (a gerar
  quando definirmos o caminho a/b/c).
- Confirmado: **Fazenda do Estado de São Paulo = ID 56** nas telas do SCP.

## Próximo passo sugerido

Definir entre (a), (b) ou (c) para a DEPRE. Enquanto isso, o DJEN pode rodar
sozinho e já começa a popular `targets` — não depende disso.
