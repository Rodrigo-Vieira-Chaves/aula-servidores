import { Controller, Get } from '@nestjs/common';

import { TabelasRepository } from './tabelas.repository';

@Controller('tabelas')
export class TabelasController {
	constructor(private readonly tabelasRepository: TabelasRepository) {}

	@Get()
	todas() {
		return this.tabelasRepository.todas();
	}
}
