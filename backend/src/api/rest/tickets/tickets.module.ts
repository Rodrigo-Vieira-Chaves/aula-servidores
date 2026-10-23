import { Module } from '@nestjs/common';

import { TicketsController } from './tickets.controller';
import { TicketsRepository } from './tickets.repository';

@Module({
	providers: [TicketsRepository],
	controllers: [TicketsController],
})
export class TicketsModule {}
