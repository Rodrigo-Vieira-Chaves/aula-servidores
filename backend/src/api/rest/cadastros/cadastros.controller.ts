import { Controller, Get } from '@nestjs/common';

import { CadastrosRepository } from './cadastros.repository';

@Controller('cadastros')
export class CadastrosController {
	constructor(private readonly cadastrosRepository: CadastrosRepository) {}

	@Get()
	async findAll() {
		return { data: await this.cadastrosRepository.findAll() };
	}
}
