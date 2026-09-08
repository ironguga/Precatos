# Pedido ao Arquivo e Biblioteca da Madeira

*Minuta pronta a enviar. Os dados de contacto do requerente estão por
preencher; tudo o resto — cotas, identificadores, assentos, anos e nomes —
está apurado e verificado contra o próprio catálogo do ABM.*

**Para:** Arquivo e Biblioteca da Madeira (ABM)
Caminho dos Álamos, n.º 35, 9020-121 Funchal
`abm@madeira.gov.pt` · formulário em `arquivo-abm.madeira.gov.pt`

**Assunto:** Pedido de reprodução de **três assentos** — dois livros
catalogados sem imagens em linha e um fólio danificado

---

Exmos. Senhores,

No âmbito de uma investigação genealógica sobre a família **Pitta da freguesia
de Nossa Senhora da Piedade dos Canhas**, concelho da Ponta do Sol, li em
linha, assento a assento, todos os livros que o vosso Arquivo disponibiliza
dessa paróquia — os três de baptismos anteriores a 1751, os quatro de
casamentos de 1640 a 1793 e os três de óbitos.

A reconstituição está fechada em **onze gerações**, cada uma com o seu
documento. **Faltam três assentos** para chegar à décima segunda, e os três
estão identificados com precisão — dois deles no vosso próprio catálogo, ao
nível do assento.

## 1 · Livro 1.º misto de registo de casamentos dos Canhas (1592/1639)

**Cota:** PT/ABM/PPTS01/002/00001 · **Identificador da descrição:** 2195
**Assento pedido:** **PT/ABM/PPTS01/002/00001/000084**, ano de **1622**,
descrito no vosso catálogo como
> «Registo de casamento: **Manuel Correia c.c. Francisca Lopes**»

**Porquê:** este casal é, por documento, a undécima geração da linha. O
assento de 26 de Novembro de 1657 (mesmo fundo, Livro 2.º, assento 000081)
declara o noivo «**Ant.º Correa, f.º de M.el Correa defunto e de sua legítima
mulher Fran.ca Lopes**». O assento de 1622 dará a filiação de Manuel Correia,
isto é, a **décima segunda geração**, que é o objectivo do pedido.

**Situação:** a descrição do livro consta do catálogo, indica «**1 liv.: 80
f.**», e os seus 155 assentos estão indexados nominalmente — alguém do Arquivo
leu o livro. Mas o *endpoint* `/api/descriptions/2195/digitalobjects` devolve
**lista vazia**, e o descarregador, que percorre por ordem as variantes
ORIGINAL, MASTER, DISSEMINATION e THUMB, não obtém nenhuma. **O livro não está
em linha.**

**Pedido concreto:** reprodução digital do fólio que contém o assento 84
(e, se possível, dos fólios imediatamente anterior e seguinte).

## 2 · Livro 2.º de registo de casamentos dos Canhas (1640/1691), assento 7

**Cota:** PT/ABM/PPTS01/002/00002 · **Identificador:** 48626
**Assento pedido:** **PT/ABM/PPTS01/002/00002/000007**, ano de **1641**,
descrito no vosso catálogo como
> «Registo de casamento: **Diogo Fernandes Pita c.c. Inês Rodrigues**»

**Porquê:** este casal é a undécima geração pelo lado Pitta — o assento de
15 de Janeiro de 1676 (mesmo livro, assento 000203) declara «**Francisco Pita,
filho de Diogo Fernandes Pita e de sua mulher Ines Roiz**». O assento de 1641
dará a filiação de Diogo Fernandes Pita.

**Situação:** o livro **está** digitalizado e li o assento na **imagem 7**. O
texto lê-se até «…recebi a **Diogo F[ernande]s Pitta, f.º de**…» e **aí a
linha entra numa mancha de humidade na margem direita do fólio que comeu a
tinta**. Ampliei a 10× com normalização local e subtracção de fundo: não há
ali nada para ler na cópia digital.

**Pedido concreto:** verificação no **original em papel**, ou reprodução com
iluminação rasante / infravermelho, das duas linhas que dão a filiação dos
noivos. Se a tinta estiver igualmente perdida no original, agradeço que mo
digam — fica documentado como perda física e não como lacuna de digitalização.

## 3 · Livro 2.º de registo de baptismos da Ponta do Sol (1614/1641)

**Cota:** PT/ABM/PPTS03/001/00002 · **Identificador da descrição:** 44085

**Porquê:** o índice nominal do vosso catálogo mostra que **não há um único
casamento Pita nos Canhas entre 1592 e 1639** — o primeiro de toda a série é o
do próprio Diogo Fernandes Pita, em 1641. A família chega à freguezia com ele,
o que significa que **nasceu noutra parte**. Descartei por documento o Arco da
Calheta (o primeiro Pita de todo o fundo é de 1771) e o Estreito da Calheta
(só no século XIX). Resta a **Ponta do Sol**, freguezia-mãe de que os Canhas
foram curato — e é este o livro que cobre a janela do nascimento dele.

**Situação:** a descrição vem marcada `HasDigitalObjects = true`, mas a API
devolve **zero páginas**. Está descrito como digitalizado e não serve imagem
nenhuma. (O Livro 3.º da mesma série, ID 44101, serve 441 páginas sem
problema, pelo que não é falha do meu lado.)

**Pedido concreto:** reprodução dos assentos de baptismo de crianças de nome
**Diogo** entre 1612 e 1622, ou — se for mais simples para o Arquivo — do
livro inteiro, que tem apenas a cobertura de 27 anos.

---

## Observação que talvez vos seja útil

Durante esta investigação encontrei três interfaces de consulta do vosso
Archeevo que devolvem sempre o mesmo resultado independentemente do parâmetro:

- `GET /api/descriptions/search?q=<termo>` — devolve o mesmo álbum
  fotográfico (PT/ABM/AAC) para qualquer termo de busca;
- `GET /api/descriptions?parent=<id>` — devolve sempre os mesmos dez registos
  (livros de pesagem de açúcar da William Hinton & Sons), qualquer que seja o
  `parent`;
- não existe endpoint de descrições-filhas (`/children`, `/descendants`,
  `/tree` devolvem 404, 400 ou 500).

O acervo está lá e está muito bem indexado — o vosso índice ao nível do
assento é excelente e foi o que me permitiu fechar a linha. **O que não
funciona é a busca.** Deixo a observação a título de contributo.

Com os melhores cumprimentos,

**[nome]**
**[morada]** · **[telefone]** · **[correio electrónico]**
