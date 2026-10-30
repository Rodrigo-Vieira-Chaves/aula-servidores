import type { WebSocket, WebSocketServer } from 'ws';
import { HEARTBEAT_MS } from '@shared/env/env.variables';

// Ping/pong: o servidor manda um ping (frame de controle, opcode 0x9) e o navegador
// responde pong (0xA) sozinho, sem passar pelo JavaScript da pagina.
// Uma conexao pode cair sem nenhum frame de close (wi-fi caiu, notebook fechou): o TCP
// nao avisa, e o servidor so descobre porque o pong nao veio.
export function manterVivo(servidor: WebSocketServer) {
	const responderam = new WeakSet<WebSocket>();

	servidor.on('connection', (cliente: WebSocket) => {
		responderam.add(cliente);
		cliente.on('pong', () => responderam.add(cliente));
	});

	const timer = setInterval(() => {
		for (const cliente of servidor.clients) {
			if (!responderam.has(cliente)) {
				cliente.terminate();
				continue;
			}

			responderam.delete(cliente);
			cliente.ping();
		}
	}, HEARTBEAT_MS).unref();

	servidor.on('close', () => clearInterval(timer));
}
