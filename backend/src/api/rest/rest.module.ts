import { Module } from '@nestjs/common';

import { TabelasModule } from './tabelas/tabelas.module';
import { TicketsModule } from './tickets/tickets.module';
import { RelacoesModule } from './relacoes/relacoes.module';
import { CadastrosModule } from './cadastros/cadastros.module';
import { ConsultasModule } from './consultas/consultas.module';
import { ConstraintsModule } from './constraints/constraints.module';

@Module({
	imports: [TabelasModule, TicketsModule, RelacoesModule, CadastrosModule, ConsultasModule, ConstraintsModule],
})
export class RestModule {}
