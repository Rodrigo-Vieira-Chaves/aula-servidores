import { UseFilters } from '@nestjs/common';
import {
	ConnectedSocket,
	MessageBody,
	OnGatewayConnection,
	OnGatewayDisconnect,
	OnGatewayInit,
	SubscribeMessage,
	WebSocketGateway,
} from '@nestjs/websockets';
import type { WebSocket, WebSocketServer } from 'ws';
import { ConexoesService } from '@core/conexoes/conexoes.service';
import { ErroWsFilter } from '@shared/filters/erro-ws.filter';

import { JogoService } from './jogo.service';

@UseFilters(ErroWsFilter)
@WebSocketGateway({ path: '/ws/jogo' })
export class JogoGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
	constructor(
		private readonly jogoService: JogoService,
		private readonly conexoesService: ConexoesService,
	) {}

	afterInit(servidor: WebSocketServer) {
		this.conexoesService.acompanhar('jogo', servidor);
	}

	handleConnection(cliente: WebSocket) {
		this.jogoService.assistir(cliente);
	}

	handleDisconnect(cliente: WebSocket) {
		this.jogoService.sair(cliente);
	}

	// O que o handler devolve volta so para quem mandou: {"event":"voce","data":{"id":3}}
	@SubscribeMessage('entrar')
	entrar(@ConnectedSocket() cliente: WebSocket, @MessageBody() data: { nome?: unknown } | null) {
		return { event: 'voce', data: this.jogoService.entrar(cliente, data?.nome) };
	}

	@SubscribeMessage('mover')
	mover(@ConnectedSocket() cliente: WebSocket, @MessageBody() data: { direcao?: unknown } | null) {
		this.jogoService.mover(cliente, data?.direcao);
	}

	// Latencia medida pela aplicacao: o navegador devolve o pong do protocolo sozinho,
	// mas nao deixa o JavaScript mandar um ping. Entao o jogo manda o proprio "ping" e
	// o servidor devolve o mesmo valor: a diferenca de tempo e a ida e volta.
	@SubscribeMessage('latencia')
	latencia(@MessageBody() data: unknown) {
		return { event: 'latencia', data };
	}
}
