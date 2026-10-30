import { Module } from '@nestjs/common';

import { ChatModule } from './chat/chat.module';
import { JogoModule } from './jogo/jogo.module';
import { LaboratorioModule } from './laboratorio/laboratorio.module';

@Module({
	imports: [ChatModule, JogoModule, LaboratorioModule],
})
export class WsModule {}
