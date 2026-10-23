function obrigatoria(nome: string) {
	const valor = process.env[nome]?.trim();

	if (!valor) {
		throw new Error(`Environment variable ${nome} is undefined or empty`);
	}

	return valor;
}

export const DATABASE_URL = obrigatoria('DATABASE_URL');
export const HTTP_PORT = Number(process.env.HTTP_PORT) || 3000;
// Imprime no log todo SQL que chega no banco, inclusive o que o Prisma gera.
export const LOG_SQL = process.env.LOG_SQL === 'true';
