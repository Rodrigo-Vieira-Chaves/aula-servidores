import { UseFilters } from '@nestjs/common';
import { MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import type { WebSocket, WebSocketServer } from 'ws';
import { ConexoesService } from '@core/conexoes/conexoes.service';
import { ErroWsFilter } from '@shared/filters/erro-ws.filter';

import { ChatService } from './chat.service';

// O gateway e o "controller" do WebSocket. Em vez de rotas (GET /api/...), ele trata
// eventos que chegam por uma conexao que fica aberta: {"event": "...", "data": ...}.
@UseFilters(ErroWsFilter)
@WebSocketGateway({ path: '/ws/chat' })
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
	constructor(
		private readonly chatService: ChatService,
		private readonly conexoesService: ConexoesService,
	) {}

	afterInit(servidor: WebSocketServer) {
		this.conexoesService.acompanhar('chat', servidor);
	}

	// Depois do handshake (o 101 Switching Protocols), a conexao esta aberta.
	handleConnection(cliente: WebSocket) {
		this.chatService.entrar(cliente);
	}

	// Fechou: frame de close, aba fechada ou o heartbeat derrubou.
	handleDisconnect(cliente: WebSocket) {
		this.chatService.sair(cliente);
	}

	// O navegador manda: {"event":"mensagem","data":{"autor":"Ana","texto":"oi"}}
	@SubscribeMessage('mensagem')
	mensagem(@MessageBody() data: { autor?: unknown; texto?: unknown } | null) {
		const { autor, texto } = data ?? {};

		this.chatService.publicar(autor, texto, 'websocket');
	}
}
