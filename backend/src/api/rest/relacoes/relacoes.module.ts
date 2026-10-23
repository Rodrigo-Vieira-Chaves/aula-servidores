import { Module } from '@nestjs/common';

import { RelacoesController } from './relacoes.controller';
import { RelacoesRepository } from './relacoes.repository';

@Module({
	providers: [RelacoesRepository],
	controllers: [RelacoesController],
})
export class RelacoesModule {}
