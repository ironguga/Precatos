# Pedido ao Arquivo e Biblioteca da Madeira

*Minuta pronta a enviar. Os dados de contacto do requerente estão por
preencher; tudo o resto — cotas, identificadores, assentos, anos e nomes —
está apurado e verificado contra o próprio catálogo do ABM.*

**Para:** Arquivo e Biblioteca da Madeira (ABM)
Caminho dos Álamos, n.º 35, 9020-121 Funchal
`abm@madeira.gov.pt` · formulário em `arquivo-abm.madeira.gov.pt`

**Assunto:** Pedido de reprodução de **dois assentos** de casamento da
paróquia dos Canhas — um livro não digitalizado e um fólio danificado

---

Exmos. Senhores,

No âmbito de uma investigação genealógica sobre a família **Pitta da freguesia
de Nossa Senhora da Piedade dos Canhas**, concelho da Ponta do Sol, li em
linha, assento a assento, todos os livros que o vosso Arquivo disponibiliza
dessa paróquia — os três de baptismos anteriores a 1751, os quatro de
casamentos de 1640 a 1793 e os três de óbitos.

A reconstituição está fechada em **onze gerações**, cada uma com o seu
documento. **Faltam apenas dois assentos**, e ambos estão identificados com
precisão no vosso próprio catálogo, ao nível do assento.

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

**Situação:** a descrição do livro consta do catálogo e os seus 155 assentos
estão indexados nominalmente — alguém do Arquivo leu o livro —, mas a API de
disseminação devolve **zero representações digitais** para o identificador
2195. O livro não está em linha.

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
