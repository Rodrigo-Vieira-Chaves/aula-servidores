import { Module } from '@nestjs/common';

import { MensagensModule } from './mensagens/mensagens.module';

@Module({
	imports: [MensagensModule],
})
export class RestModule {}
