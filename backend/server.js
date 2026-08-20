import express from 'express';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const app = express();
const PORTA = Number(process.env.PORT) || 3000;
const SERVIDOR = process.env.NOME_SERVIDOR || os.hostname();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/api/pessoas', async (req, res) => {
  const busca = (req.query.busca || '').trim();

  try {
    const { rows } = await pool.query(
      'SELECT id, nome FROM pessoas WHERE nome ILIKE $1 ORDER BY nome LIMIT 50',
      [`%${busca}%`]
    );
    res.json({ servidor: SERVIDOR, total: rows.length, dados: rows });
  } catch (erro) {
    console.error(erro.message);
    res.status(500).json({ servidor: SERVIDOR, erro: 'falha ao consultar o banco' });
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
});
