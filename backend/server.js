import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';
import {
  COOKIE_MAX_AGE,
  COOKIE_OPCOES,
  COOKIE_SESSAO,
  conferirSenha,
  exigirLogin,
  gerarToken
} from './auth.js';

const app = express();
const PORTA = Number(process.env.PORT) || 3000;
const SERVIDOR = process.env.NOME_SERVIDOR || os.hostname();

const ORIGENS_PERMITIDAS = (
  process.env.ORIGENS_PERMITIDAS ||
  'https://rodrigovieirachaves.com,https://www.rodrigovieirachaves.com'
)
  .split(',')
  .map((origem) => origem.trim())
  .filter(Boolean);

// credentials: true e o que permite o cookie de sessao atravessar origens.
// Com ele ligado, o navegador exige a origem exata na resposta — `*` e recusado.
app.use(
  cors({
    origin: ORIGENS_PERMITIDAS,
    credentials: true,
    exposedHeaders: ['X-Backend']
  })
);

app.use(cookieParser());
app.use(express.json());

// Atras do Nginx e do Cloudflare: confia no X-Forwarded-* do primeiro proxy.
app.set('trust proxy', 1);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.post('/api/login', async (req, res) => {
  const usuario = (req.body?.usuario || '').trim();
  const senha = req.body?.senha || '';

  if (!usuario || !senha) {
    return res.status(400).json({ erro: 'informe usuario e senha' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, usuario, senha_hash FROM usuarios WHERE usuario = $1',
      [usuario]
    );

    const conta = rows[0];
    // Mesma resposta para usuario inexistente e senha errada: nao entregamos
    // ao atacante a informacao de quais contas existem.
    if (!conta || !conferirSenha(senha, conta.senha_hash)) {
      return res.status(401).json({ erro: 'usuario ou senha invalidos' });
    }

    // O token vai no cookie, nunca no corpo da resposta: se o JS pudesse
    // le-lo, HttpOnly nao serviria para nada.
    res.cookie(COOKIE_SESSAO, gerarToken(conta), { ...COOKIE_OPCOES, maxAge: COOKIE_MAX_AGE });
    res.json({ usuario: conta.usuario, servidor: SERVIDOR });
  } catch (erro) {
    console.error(erro.message);
    res.status(500).json({ erro: 'falha ao autenticar', motivo: erro.message });
  }
});

app.post('/api/logout', (req, res) => {
  // Os mesmos atributos do login, senao o navegador nao reconhece o cookie.
  res.clearCookie(COOKIE_SESSAO, COOKIE_OPCOES);
  res.status(204).end();
});

app.get('/api/eu', exigirLogin, (req, res) => {
  res.json({ usuario: req.usuario.usuario, servidor: SERVIDOR });
});

app.get('/api/pessoas', exigirLogin, async (req, res) => {
  const busca = (req.query.busca || '').trim();

  try {
    const { rows } = await pool.query(
      'SELECT id, nome FROM pessoas WHERE nome ILIKE $1 ORDER BY nome LIMIT 50',
      [`%${busca}%`]
    );
    res.json({ servidor: SERVIDOR, total: rows.length, dados: rows });
  } catch (erro) {
    console.error(erro.message);
    res.status(500).json({
      servidor: SERVIDOR,
      erro: 'falha ao consultar o banco',
      motivo: erro.message
    });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ servidor: SERVIDOR, banco: 'ok' });
  } catch (erro) {
    res.status(503).json({
      servidor: SERVIDOR,
      banco: 'indisponivel',
      motivo: erro.message,
      alvo: `${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`
    });
  }
});

app.listen(PORTA, '0.0.0.0', () => {
  console.log(`backend ${SERVIDOR} escutando na porta ${PORTA}`);
  console.log(`origens permitidas: ${ORIGENS_PERMITIDAS.join(', ')}`);
});
