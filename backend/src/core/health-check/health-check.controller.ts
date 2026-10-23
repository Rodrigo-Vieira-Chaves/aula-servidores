import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '@core/database/database.service';
import { DATABASE_URL } from '@shared/env/env.variables';

// So o host e a porta: a senha que esta na DATABASE_URL nunca sai daqui.
const { hostname, port } = new URL(DATABASE_URL);
const BANCO = `${hostname}:${port || 5432}`;

@Controller('health-check')
export class HealthCheckController {
	constructor(private readonly databaseService: DatabaseService) {}

	@Get()
	async handle() {
		try {
			const [{ versao }] = await this.databaseService.$queryRaw<{ versao: string }[]>`SELECT current_setting('server_version') AS versao`;

			return { banco: 'ok', host: BANCO, versao };
		} catch (erro) {
			throw new ServiceUnavailableException({
				banco: 'indisponivel',
				host: BANCO,
				motivo: erro instanceof Error ? erro.message : String(erro),
			});
		}
	}
}
