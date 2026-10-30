import { Module } from '@nestjs/common';

import { JogoGateway } from './jogo.gateway';
import { JogoService } from './jogo.service';

@Module({
	providers: [JogoGateway, JogoService],
})
export class JogoModule {}
