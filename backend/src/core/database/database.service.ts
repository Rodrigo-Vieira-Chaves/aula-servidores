import { PrismaPg } from '@prisma/adapter-pg';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DATABASE_URL, LOG_SQL } from '@shared/env/env.variables';
import { ResultadoSql, textoDoSql } from '@shared/utils';

import { Prisma, PrismaClient } from '../prisma';

const adapter = new PrismaPg({ connectionString: DATABASE_URL });

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
	constructor() {
		super({ adapter, log: LOG_SQL ? ['query'] : [] });
	}

	async onModuleInit() {
		await this.$connect();
	}

	async onModuleDestroy() {
		await this.$disconnect();
	}

	// Roda um SQL escrito a mao e devolve junto o proprio SQL, para a tela exibir.
	async consultar<T = Record<string, unknown>>(sql: Prisma.Sql): Promise<ResultadoSql<T>> {
		const dados = await this.$queryRaw<T[]>(sql);

		return { sql: textoDoSql(sql), dados };
	}
}
