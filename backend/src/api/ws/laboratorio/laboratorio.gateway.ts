import type { IncomingMessage } from 'node:http';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayInit, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import type { WebSocket, WebSocketServer } from 'ws';
import { ConexoesService } from '@core/conexoes/conexoes.service';
import { enviar } from '@shared/ws/enviar';
import { descreverHandshake } from '@shared/ws/handshake';

// Usado pelas telas da aula: mostra o handshake, devolve o que recebe e fecha quando pedem.
@WebSocketGateway({ path: '/ws/laboratorio' })
export class LaboratorioGateway implements OnGatewayInit, OnGatewayConnection {
	// A resposta 101 que o ws escreveu em cada handshake, para devolver para a tela.
	private readonly respostas = new WeakMap<IncomingMessage, string[]>();

	constructor(private readonly conexoesService: ConexoesService) {}

	afterInit(servidor: WebSocketServer) {
		this.conexoesService.acompanhar('laboratorio', servidor);

		// "headers": o ws avisa logo antes de escrever a resposta do handshake.
		servidor.on('headers', (linhas: string[], requisicao: IncomingMessage) => this.respostas.set(requisicao, [...linhas]));
	}

	// O JavaScript do navegador nao enxerga os cabecalhos do handshake.
	// Entao, assim que a conexao abre, o servidor conta o que recebeu e o que respondeu.
	handleConnection(cliente: WebSocket, requisicao: IncomingMessage) {
		enviar(cliente, 'handshake', descreverHandshake(requisicao, this.respostas.get(requisicao) ?? []));
	}

	@SubscribeMessage('eco')
	eco(@MessageBody() data: unknown) {
		return { event: 'eco', data };
	}

	@SubscribeMessage('fechar')
	fechar(@ConnectedSocket() cliente: WebSocket) {
		// Os codigos de 4000 a 4999 sao livres para a aplicacao. O motivo vai junto no frame de close.
		cliente.close(4000, 'o servidor encerrou a conexão');
	}
}
