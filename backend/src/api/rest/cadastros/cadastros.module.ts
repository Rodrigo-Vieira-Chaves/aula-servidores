import { Module } from '@nestjs/common';

import { CadastrosController } from './cadastros.controller';
import { CadastrosRepository } from './cadastros.repository';

@Module({
	exports: [CadastrosRepository],
	providers: [CadastrosRepository],
	controllers: [CadastrosController],
})
export class CadastrosModule {}
