import { Injectable } from '@nestjs/common';
import { Prisma } from '@core/prisma';
import { DatabaseService } from '@core/database/database.service';
import { textoDoSql } from '@shared/utils';

type Experimento = {
	comando: Prisma.Sql;
	// Consultas rodadas antes e depois do comando, para mostrar o efeito dele.
	verificacoes?: Prisma.Sql[];
};

// Cada experimento tenta fazer algo e mostra como o banco reage.
const EXPERIMENTOS: Record<string, Experimento> = {
	default: {
		comando: Prisma.sql`
			INSERT INTO tickets (titulo, cliente_id)
			VALUES ('Testando o DEFAULT', 5)
			RETURNING *
		`,
	},
	'not-null': {
		comando: Prisma.sql`
			INSERT INTO clientes (nome, email)
			VALUES ('Cliente sem e-mail', NULL)
		`,
	},
	unique: {
		comando: Prisma.sql`
			INSERT INTO clientes (nome, email)
			VALUES ('Outra Fernanda', 'fernanda@email.com')
		`,
	},
	check: {
		comando: Prisma.sql`
			INSERT INTO avaliacoes (ticket_id, nota)
			VALUES (4, 7)
		`,
	},
	enum: {
		comando: Prisma.sql`
			UPDATE tickets
			SET status = 'PERDIDO'
			WHERE id = 7
		`,
	},
	'foreign-key': {
		comando: Prisma.sql`
			INSERT INTO tickets (titulo, cliente_id)
			VALUES ('Ticket de ninguém', 999)
		`,
	},
	'um-para-um': {
		comando: Prisma.sql`
			INSERT INTO avaliacoes (ticket_id, nota)
			VALUES (1, 3)
		`,
	},
	'muitos-para-muitos': {
		comando: Prisma.sql`
			INSERT INTO tickets_tags (ticket_id, tag_id)
			VALUES (1, 1)
		`,
	},
	restrict: {
		comando: Prisma.sql`
			DELETE FROM clientes
			WHERE id = 1
		`,
	},
	'set-null': {
		comando: Prisma.sql`
			DELETE FROM atendentes
			WHERE id = 1
			RETURNING *
		`,
		verificacoes: [
			Prisma.sql`
				SELECT id, titulo, status, atendente_id
				FROM tickets
				WHERE id IN (1, 2)
				ORDER BY id
			`,
		],
	},
	cascade: {
		comando: Prisma.sql`
			DELETE FROM tickets
			WHERE id = 1
			RETURNING *
		`,
		verificacoes: [Prisma.sql`SELECT * FROM avaliacoes WHERE ticket_id = 1`, Prisma.sql`SELECT * FROM tickets_tags WHERE ticket_id = 1`],
	},
};

type CausaDoErro = { originalCode?: string; originalMessage?: string; detail?: string };

// Lancado de proposito para o $transaction fazer ROLLBACK.
class Rollback extends Error {}

@Injectable()
export class ConstraintsRepository {
	constructor(private readonly databaseService: DatabaseService) {}

	// O proprio Postgres conta quais constraints existem: o catalogo pg_constraint.
	// O Prisma cria UNIQUE como indice unico, por isso o UNION com pg_index.
	catalogo() {
		return this.databaseService.consultar(Prisma.sql`
			SELECT conrelid::regclass::text AS tabela,
			       conname AS nome,
			       CASE contype
			         WHEN 'p' THEN 'PRIMARY KEY'
			         WHEN 'f' THEN 'FOREIGN KEY'
			         WHEN 'u' THEN 'UNIQUE'
			         WHEN 'c' THEN 'CHECK'
			         WHEN 'n' THEN 'NOT NULL'
			       END AS tipo,
			       pg_get_constraintdef(oid) AS definicao
			FROM pg_constraint
			WHERE connamespace = 'public'::regnamespace
			  AND conrelid::regclass::text <> '_prisma_migrations'
			UNION ALL
			SELECT indrelid::regclass::text,
			       indexrelid::regclass::text,
			       'UNIQUE',
			       regexp_replace(pg_get_indexdef(indexrelid), '^.* USING \\w+ ', 'UNIQUE ')
			FROM pg_index
			JOIN pg_class ON pg_class.oid = pg_index.indrelid
			WHERE indisunique AND NOT indisprimary
			  AND relnamespace = 'public'::regnamespace
			ORDER BY tabela, tipo, nome
		`);
	}

	listarExperimentos() {
		return Object.entries(EXPERIMENTOS).map(([id, experimento]) => ({
			id,
			comando: textoDoSql(experimento.comando),
			verificacoes: (experimento.verificacoes ?? []).map(textoDoSql),
		}));
	}

	// Tudo roda numa transacao que sempre termina em ROLLBACK:
	// da para repetir o experimento quantas vezes quiser sem mudar os dados da aula.
	async executar(id: string) {
		const experimento = EXPERIMENTOS[id];

		if (!experimento) {
			return null;
		}

		const verificacoes = (experimento.verificacoes ?? []).map((sql) => ({
			sql: textoDoSql(sql),
			antes: [] as unknown[],
			depois: [] as unknown[],
		}));
		let retorno: unknown[] = [];
		let erro: ReturnType<typeof erroDoPostgres> | null = null;

		try {
			await this.databaseService.$transaction(async (tx) => {
				for (const [indice, sql] of (experimento.verificacoes ?? []).entries()) {
					verificacoes[indice].antes = await tx.$queryRaw(sql);
				}

				retorno = await tx.$queryRaw(experimento.comando);

				for (const [indice, sql] of (experimento.verificacoes ?? []).entries()) {
					verificacoes[indice].depois = await tx.$queryRaw(sql);
				}

				throw new Rollback();
			});
		} catch (falha) {
			if (!(falha instanceof Rollback)) {
				erro = erroDoPostgres(falha);
			}
		}

		return { id, comando: textoDoSql(experimento.comando), aceito: erro === null, retorno, verificacoes, erro };
	}
}

// O Prisma embrulha o erro do Postgres; aqui desembrulhamos o que interessa para a aula.
function erroDoPostgres(falha: unknown) {
	const causa =
		falha instanceof Prisma.PrismaClientKnownRequestError
			? (falha.meta?.driverAdapterError as { cause?: CausaDoErro } | undefined)?.cause
			: undefined;
	const mensagem = causa?.originalMessage ?? (falha instanceof Error ? falha.message : String(falha));

	return {
		codigo: causa?.originalCode ?? null,
		constraint: mensagem.match(/constraint "([^"]+)"/)?.[1] ?? null,
		mensagem,
		detalhe: causa?.detail ?? null,
	};
}
