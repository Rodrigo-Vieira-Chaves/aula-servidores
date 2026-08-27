import { pool } from './db.js';
import { hashSenha } from './auth.js';

const USUARIO_DEMO = process.env.USUARIO_DEMO || 'aluno';
const SENHA_DEMO = process.env.SENHA_DEMO || 'aula123';

const NOMES = [
  'Ana Beatriz Souza', 'Bruno Carvalho Lima', 'Carla Menezes Rocha',
  'Daniel Figueiredo Alves', 'Eduarda Nogueira Pinto', 'Fabio Ramos Teixeira',
  'Gabriela Moreira Castro', 'Henrique Barbosa Dias', 'Isabela Cardoso Freitas',
  'Joao Pedro Martins', 'Karina Duarte Antunes', 'Lucas Andrade Peixoto',
  'Mariana Bastos Correia', 'Nicolas Vieira Chaves', 'Olivia Sampaio Lacerda',
  'Paulo Cesar Monteiro', 'Quezia Nascimento Braga', 'Rafael Siqueira Amaral',
  'Sabrina Toledo Guimaraes', 'Thiago Bezerra Pontes', 'Ursula Campos Meireles',
  'Vinicius Aragao Fontes', 'Wesley Prado Salgado', 'Yasmin Cordeiro Bastos',
  'Zeca Almeida Paiva', 'Amanda Rezende Vasconcelos', 'Bernardo Quintela Muniz',
  'Camila Serrano Delgado', 'Diego Fontoura Bittencourt', 'Elisa Marchetti Ferraz',
  'Felipe Aguiar Trindade', 'Giovanna Padilha Rezende', 'Hugo Leitao Marques',
  'Ingrid Vasques Bandeira', 'Jonas Tavares Espindola', 'Leticia Fagundes Xavier',
  'Marcelo Bueno Sampaio', 'Natalia Cunha Verissimo', 'Otavio Rangel Portela',
  'Priscila Ferraz Goulart', 'Renato Vilela Assuncao', 'Simone Drummond Pacheco',
  'Tatiana Wagner Bulhoes', 'Ulisses Moraes Caldeira', 'Vanessa Lobo Estevao',
  'Wagner Coutinho Peres', 'Xenia Barreto Machado', 'Yuri Salazar Camargo',
  'Zilda Ferreira Nunes', 'Arthur Benicio Pimentel'
];

async function esperarBanco(tentativas = 10, intervaloMs = 3000) {
  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (erro) {
      console.log(`banco indisponivel (${erro.message}) — tentativa ${tentativa}/${tentativas}`);
      if (tentativa === tentativas) throw erro;
      await new Promise((resolve) => setTimeout(resolve, intervaloMs));
    }
  }
}

async function migrarPessoas() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pessoas (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL
    )
  `);
  console.log('tabela pessoas pronta');

  const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM pessoas');
  if (rows[0].total > 0) {
    console.log(`ja existem ${rows[0].total} registros, seed ignorado`);
    return;
  }

  await pool.query(
    'INSERT INTO pessoas (nome) SELECT unnest($1::text[])',
    [NOMES]
  );
  console.log(`${NOMES.length} nomes inseridos`);
}

async function migrarUsuarios() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      usuario TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL
    )
  `);
  console.log('tabela usuarios pronta');

  // O hash e gerado aqui: o banco nunca ve a senha em texto puro.
  const { rowCount } = await pool.query(
    `INSERT INTO usuarios (usuario, senha_hash) VALUES ($1, $2)
     ON CONFLICT (usuario) DO NOTHING`,
    [USUARIO_DEMO, hashSenha(SENHA_DEMO)]
  );

  console.log(
    rowCount > 0
      ? `usuario "${USUARIO_DEMO}" criado`
      : `usuario "${USUARIO_DEMO}" ja existe, seed ignorado`
  );
}

async function migrate() {
  await esperarBanco();

  try {
    await migrarPessoas();
    await migrarUsuarios();
  } finally {
    await pool.end();
  }
}

migrate().catch((erro) => {
  console.error('falha na migration:', erro.message);
  process.exit(1);
});
