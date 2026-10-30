import { Module } from '@nestjs/common';
import { ChatModule } from '@api/ws/chat/chat.module';

import { MensagensController } from './mensagens.controller';

@Module({
	imports: [ChatModule],
	controllers: [MensagensController],
})
export class MensagensModule {}
