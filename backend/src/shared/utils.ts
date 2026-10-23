import type { Prisma } from '@core/prisma';

export type ResultadoSql<T = Record<string, unknown>> = {
	sql: string;
	dados: T[];
};

// Tira a indentacao que o SQL herda do codigo, para a tela mostrar o comando limpo.
export function textoDoSql(sql: Prisma.Sql) {
	const linhas = sql.text.replace(/^\n+|\s+$/g, '').split('\n');
	const recuo = Math.min(...linhas.filter((linha) => linha.trim()).map((linha) => linha.match(/^\s*/)?.[0].length ?? 0));

	return linhas.map((linha) => linha.slice(recuo)).join('\n');
}
