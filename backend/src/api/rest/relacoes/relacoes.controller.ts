import { Controller, Get } from '@nestjs/common';

import { RelacoesRepository } from './relacoes.repository';

@Controller('relacoes')
export class RelacoesController {
	constructor(private readonly relacoesRepository: RelacoesRepository) {}

	@Get('um-para-muitos')
	umParaMuitos() {
		return this.relacoesRepository.umParaMuitos();
	}

	@Get('um-para-um')
	umParaUm() {
		return this.relacoesRepository.umParaUm();
	}

	@Get('muitos-para-muitos')
	muitosParaMuitos() {
		return this.relacoesRepository.muitosParaMuitos();
	}
}
