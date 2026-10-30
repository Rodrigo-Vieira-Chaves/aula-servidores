import { WebSocket } from 'ws';

// O WebSocket so transporta texto (ou bytes). O formato { event, data } e uma
// convencao do NestJS: e assim que o WsAdapter sabe qual @SubscribeMessage chamar.
export function enviar(cliente: WebSocket, event: string, data: unknown) {
	if (cliente.readyState === WebSocket.OPEN) {
		cliente.send(JSON.stringify({ event, data }));
	}
}

// Broadcast: o protocolo nao tem "mandar para todos". O servidor serializa uma vez
// e manda o mesmo texto para cada conexao aberta, uma por uma.
export function transmitir(clientes: Iterable<WebSocket>, event: string, data: unknown) {
	const texto = JSON.stringify({ event, data });

	for (const cliente of clientes) {
		if (cliente.readyState === WebSocket.OPEN) {
			cliente.send(texto);
		}
	}
}
