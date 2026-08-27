import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const COOKIE_SESSAO = 'sessao';

const SEGREDO = process.env.JWT_SEGREDO || 'segredo-de-aula-troque-em-producao';
const VALIDADE_SEGUNDOS = Number(process.env.JWT_VALIDADE_SEGUNDOS) || 60 * 60 * 8;

export const COOKIE_MAX_AGE = VALIDADE_SEGUNDOS * 1000;

export const COOKIE_OPCOES = {
  path: '/',
  httpOnly: true,                                        // JavaScript nao le: defesa contra XSS
  secure: process.env.COOKIE_SEGURO !== 'false',         // so trafega em HTTPS
  sameSite: process.env.COOKIE_SAMESITE || 'lax',        // defesa contra CSRF
  domain: process.env.COOKIE_DOMINIO || undefined
};

export const gerarToken = (conta) =>
  jwt.sign({ sub: conta.id, usuario: conta.usuario }, SEGREDO, { expiresIn: VALIDADE_SEGUNDOS });

export const hashSenha = (senha) => bcrypt.hashSync(senha, 10);

export const conferirSenha = (senha, hash) => bcrypt.compareSync(senha, hash);

export function exigirLogin(req, res, next) {
  try {
    const { sub, usuario } = jwt.verify(req.cookies[COOKIE_SESSAO], SEGREDO);
    req.usuario = { id: sub, usuario };
    next();
  } catch {
    // Sem cookie, assinatura invalida ou token expirado caem todos aqui.
    res.status(401).json({ erro: 'nao autenticado' });
  }
}
