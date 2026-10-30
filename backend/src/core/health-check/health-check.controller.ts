import { Controller, Get } from '@nestjs/common';
import { ConexoesService } from '@core/conexoes/conexoes.service';

const NO_AR_DESDE = new Date().toISOString();

@Controller('health-check')
export class HealthCheckController {
	constructor(private readonly conexoesService: ConexoesService) {}

	@Get()
	handle() {
		return { status: 'ok', noArDesde: NO_AR_DESDE, conexoes: this.conexoesService.contagem() };
	}
}
