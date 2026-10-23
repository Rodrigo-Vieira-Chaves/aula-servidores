# Roteiro da aula: modelagem de dados com PostgreSQL

**Objetivo:** sair do enunciado de um sistema e chegar nas tabelas, nas relações e nas regras do
banco. Depois, subir esse banco na AWS, ligar o backend nele e consultar os dados com JOIN e UNION.

**Fio condutor:** um mini sistema de atendimento, inspirado num sistema real de tickets. É pequeno
o suficiente para caber na lousa e tem todos os casos: 1:1, 1:N, N:M, relação opcional e as três
ações de `ON DELETE`.

A ordem abaixo é a ordem das telas do sistema. As setas `←` `→` (ou o passador de slides) andam
entre elas, e a tecla `M` esconde o menu para sobrar espaço no projetor.

---

## Antes da aula

- [ ] EC2 criada, Docker instalado e o repositório clonado (passo a passo na parte 3)
- [ ] `docker compose up -d --build` rodou e http://IP:3000 abre
- [ ] O selo no topo da tela mostra **PostgreSQL 18.x · banco:5432** em verde
- [ ] `docker compose exec backend npm run seed:reset` para começar com os dados limpos
- [ ] Um terminal aberto no servidor para o `psql` e para o `docker compose logs -f backend`

---

## 1. Do enunciado às entidades (lousa)

Escreva o enunciado na lousa:

> Clientes abrem tickets. Atendentes cuidam dos tickets. O cliente pode avaliar o atendimento.
> Os tickets recebem tags para organizar a fila.

- **Substantivos viram entidades** (tabelas): cliente, ticket, atendente, avaliação, tag.
- **Características viram atributos** (colunas): nome, e-mail, título, status, nota...
- **Verbos viram relações**: abre, cuida, avalia, recebe.

Para descobrir a cardinalidade, pergunte **nos dois sentidos** e deixe a turma responder:

| Relação | Ida | Volta | Resultado |
|---|---|---|---|
| cliente abre ticket | um cliente abre quantos tickets? **vários** | um ticket é de quantos clientes? **um** | **1:N** |
| atendente cuida de ticket | um atendente cuida de quantos? **vários** | um ticket tem quantos atendentes? **zero ou um** | **1:N opcional** |
| ticket recebe avaliação | um ticket tem quantas avaliações? **zero ou uma** | uma avaliação é de quantos tickets? **um** | **1:1** |
| ticket recebe tag | um ticket tem quantas tags? **várias** | uma tag está em quantos tickets? **vários** | **N:M** |

Puxe a discussão do "zero ou um": um ticket recém-aberto ainda não tem atendente, e isso vai
virar um `NULL` permitido. Essa decisão de modelagem é o que faz o LEFT JOIN e o RIGHT JOIN
mostrarem resultados diferentes mais tarde.

## 2. Do modelo ao banco

Ainda na lousa, ou já mostrando o [schema.prisma](backend/prisma/schema.prisma):

- **Tipos**: `SERIAL`/`INT`, `TEXT`, `BOOLEAN`, `TIMESTAMP` e um `ENUM` para o status.
- **Chave primária**: usamos um `id` gerado pelo banco, e não o e-mail. O e-mail muda, e uma PK
  não deveria mudar nunca. O e-mail continua único, mas com `UNIQUE`.
- **Como implementar cada relação** (este é o coração da aula):
  - **1:N**: a FK fica **sempre no lado N**: `tickets.cliente_id`.
  - **1:1**: é uma 1:N com `UNIQUE` na FK: `avaliacoes.ticket_id UNIQUE`.
  - **N:M**: não cabe numa FK só. Precisa de uma **tabela associativa**, `tickets_tags`, com uma
    FK para cada lado e PK composta `(ticket_id, tag_id)`. A N:M vira duas 1:N.
- **O que não fazer** (vale perguntar à turma por que está errado):
  - uma coluna `tags` com o texto `"urgente,financeiro"` quebra a 1ª forma normal: o banco não
    valida, não indexa e não faz JOIN;
  - copiar o nome do cliente para dentro do ticket cria redundância, e cedo ou tarde os dois
    nomes ficam diferentes.
- **Índices**: o Postgres cria índice para PK e UNIQUE, mas **não** para FK. Por isso o schema
  tem `@@index([clienteId])` e similares.

Depois, mostre o caminho do Prisma até o banco:

1. [schema.prisma](backend/prisma/schema.prisma): `model` é tabela, `@id` é PK, `@unique` é
   UNIQUE, `@relation` é FK, `@map` é o nome real da coluna, `@@id` é PK composta e `onDelete`
   define a ação.
2. [migration.sql](backend/prisma/migrations/20261023120000_init/migration.sql): o SQL que o
   Prisma gerou a partir do schema. Mostre as linhas no final:
   - os `ALTER TABLE ... FOREIGN KEY ... ON DELETE` com as três ações;
   - o `CHECK (nota BETWEEN 1 AND 5)`, que foi **escrito à mão**, porque o Prisma não sabe
     declarar CHECK. O ORM não cobre tudo, e a migration é SQL que você pode editar.
3. Para gerar uma migration nova em desenvolvimento: `npx prisma migrate dev --name <nome>`.

## 3. Subindo na AWS

A arquitetura (desenhe na lousa):

```
navegador ──:3000──> EC2 [ container backend ] ──:5432──> [ container banco ]
```

### Passo a passo

1. **EC2**: Ubuntu 24.04. Uma `t3.small` é o mais tranquilo; numa `t3.micro` (1 GB), crie
   swap antes do build (passo 3).
2. **Security Group**:
   - 22 (SSH): só o seu IP;
   - 3000 (aplicação): 0.0.0.0/0 durante a aula;
   - 5432 (Postgres): **fechada**, ou só o seu IP se quiser usar o DBeaver. Vale comentar: banco
     exposto para a internet com senha fraca é invadido em horas.
3. **Docker** (no servidor):

   ```bash
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker $USER && exit       # saia e entre de novo no SSH

   # só em instância de 1 GB:
   sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
   ```

4. **Subir**:

   ```bash
   git clone https://github.com/Rodrigo-Vieira-Chaves/aula-servidores.git
   cd aula-servidores
   docker compose up -d --build
   docker compose logs -f backend
   ```

   Mostre nos logs a ordem das coisas: a migration cria as tabelas, o seed popula e o Nest sobe.
5. **Abrir** `http://IP-PUBLICO:3000`. O selo verde no topo diz em que banco o backend está
   conectado.
6. **psql ao vivo** (não precisa abrir porta nenhuma):

   ```bash
   docker compose exec banco psql -U app -d aula
   ```

   ```sql
   \dt
   \d tickets
   SELECT * FROM tickets;
   ```

   O `\d tickets` mostra as FKs e os índices: é a modelagem vista de dentro do banco.

### Variante: banco em servidor separado

É o cenário de produção. Se der tempo, faça ao vivo:

1. Segunda EC2 só para o banco: `docker compose up -d banco`.
2. No Security Group do banco, libere a 5432 **apenas para o Security Group do backend**.
3. No servidor do backend: `DB_HOST=<ip privado do banco> docker compose up -d --build --no-deps backend`.
4. O selo no topo passa a mostrar o IP privado do banco.

Se aparecer `P1001: Can't reach database server`, é Security Group ou IP errado. Vale deixar
acontecer de propósito uma vez: é o erro mais comum de quem sobe banco na nuvem.

Comente que existe o **RDS**: o banco gerenciado da AWS, com backup, atualização e réplica
prontos. Rodar o Postgres em container é ótimo para aprender e para ambientes pequenos; em
produção, o normal é usar o banco gerenciado.

## 4. Tour pelo modelo (telas 1 a 4)

**Tela 1: Diagrama e tabelas.** Compare o diagrama com o que foi desenhado na lousa. Passe o
mouse num ticket: acendem o cliente, o atendente, a avaliação e as tags dele. É a FK "puxando" as
linhas ligadas.

**Telas 2 a 4: 1:N, 1:1 e N:M.** Cada uma tem a mesma estrutura: a frase da relação, o diagrama,
"como se faz", a mesma tabela em SQL e no Prisma, os dados e o JOIN que liga as tabelas.

- **1:N**: aponte a coluna `cliente_id` destacada. No resultado, Fernanda aparece duas vezes
  (dois tickets) e Igor não aparece (não abriu nenhum).
- **1:1**: sem o UNIQUE, viraria 1:N. O ticket 4 está fechado e sem avaliação: o lado da
  avaliação é 0..1.
- **N:M**: passe o mouse numa linha de `tickets_tags` para acender o ticket e a tag. A consulta
  tem dois JOINs porque passa pela tabela do meio.

## 5. Constraints na prática (tela 5)

Comece pelo quadro do topo: é o próprio Postgres listando as regras que ele garante (lido do
`pg_constraint`).

Para cada experimento, **pergunte antes de clicar**: "o banco vai aceitar?".

- **DEFAULT**: o INSERT não informa status nem data, e o banco completa. Clique duas vezes e
  repare que o id **pula** (8, 9...): a sequence não volta no ROLLBACK.
- **NOT NULL, UNIQUE, CHECK, ENUM**: regras de coluna. Mostre o código SQLSTATE e o nome da
  constraint na resposta: é com eles que um backend transforma o erro do banco numa mensagem
  amigável ("e-mail já cadastrado").
- **FOREIGN KEY**: não existe cliente 999, e o ticket órfão não nasce.
- **UNIQUE na FK**: segunda avaliação para o mesmo ticket. É a 1:1 sendo garantida.
- **PK composta**: a mesma tag duas vezes no mesmo ticket.
- **RESTRICT, SET NULL e CASCADE**: a mesma operação (apagar) com três comportamentos. Cada um
  foi uma **decisão de modelagem**:
  - cliente com histórico não some (RESTRICT);
  - atendente que sai devolve os tickets para a fila (SET NULL);
  - ticket apagado leva junto avaliação e tags, que não fazem sentido sozinhas (CASCADE).

Tudo roda numa transação com ROLLBACK, então pode clicar à vontade: os dados da aula não mudam.

Bom ponto para discutir: "só pode avaliar ticket FECHADO" **não** cabe num CHECK, porque o CHECK
só enxerga a própria linha. Uma regra assim fica na aplicação (ou num trigger).

## 6. Consultas (telas 6 a 11)

Os quatro JOINs usam **o mesmo par de tabelas e as mesmas colunas**: A = `atendentes`, B =
`tickets`. Só muda o tipo de JOIN. Antes de mostrar cada resultado, peça para a turma **prever
quantas linhas** vão sair.

| Tela | Consulta | Linhas | O que destacar |
|---|---|---|---|
| 6 | SELECT | 3 | WHERE filtra linhas, a lista do SELECT escolhe colunas, sem ORDER BY não há ordem |
| 7 | INNER JOIN | 4 | Ana aparece 2 vezes; Diego, Eduarda e a fila somem |
| 8 | LEFT JOIN | 6 | Diego e Eduarda voltam com NULL; a dica mostra o anti-join (`WHERE t.id IS NULL`) |
| 9 | RIGHT JOIN | 7 | os tickets 5, 6 e 7 aparecem sem atendente; RIGHT é um LEFT com as tabelas trocadas |
| 10 | FULL OUTER JOIN | 9 | tudo dos dois lados; o MySQL não tem, e lá se faz com UNION |
| 11 | UNION / UNION ALL | 9 / 10 | o Bruno é cliente e atendente; UNION tira o repetido, UNION ALL mantém |

- Passe o mouse numa linha do resultado para acender as linhas de A e de B que a geraram.
- O Venn mostra **quais** linhas entram, não **quantas vezes**. O INNER JOIN é a prova: a Ana
  está "na interseção", mas sai duas vezes.
- No UNION, feche com a frase da tela: **JOIN cresce para o lado (colunas), UNION cresce para
  baixo (linhas)**.

## 7. No código (tela 12)

O mesmo ticket buscado pelo Prisma com `include`. Deixe o `docker compose logs -f backend` aberto
e clique no ticket 1: o Prisma **não** faz um JOIN. Ele manda **um SELECT por relação** (seis ao
todo, contando o do próprio ticket) e monta o objeto em memória.

A mensagem: o ORM é ótimo para o dia a dia, mas só funciona porque as relações foram modeladas
direito, e quem sabe SQL consegue perceber o que ele está fazendo por baixo.

## 8. Fechamento

- Entidade vira tabela, atributo vira coluna, e toda tabela tem PK.
- 1:N põe a FK no lado N. 1:1 é FK + UNIQUE. N:M precisa de tabela associativa.
- Constraints colocam as regras no banco, que vale para qualquer um que escreva nele.
- `ON DELETE` é decisão de negócio, não detalhe técnico.
- INNER traz só o que casa. LEFT, RIGHT e FULL mantêm o que não casou, com NULL. UNION empilha.

### Para praticar

1. Adicione uma coluna `prioridade` em `tickets` que aceite só `baixa`, `media` ou `alta`.
   Resolva com CHECK e depois com ENUM. Qual a diferença?
2. Modele as **mensagens** de um ticket. Que relação é? Onde fica a FK?
3. Escreva a consulta "quantos tickets cada atendente tem, **incluindo quem tem zero**". Dica:
   LEFT JOIN + `GROUP BY`. Compare `COUNT(*)` com `COUNT(t.id)` e explique a diferença.
4. Liste os clientes que nunca abriram ticket, de dois jeitos: com LEFT JOIN e com `NOT EXISTS`.
