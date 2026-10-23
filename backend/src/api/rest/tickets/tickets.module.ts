import { Module } from '@nestjs/common';
import { CadastrosModule } from '@api/rest/cadastros/cadastros.module';

import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { TicketsRepository } from './tickets.repository';

@Module({
	imports: [CadastrosModule],
	providers: [TicketsService, TicketsRepository],
	controllers: [TicketsController],
})
export class TicketsModule {}
