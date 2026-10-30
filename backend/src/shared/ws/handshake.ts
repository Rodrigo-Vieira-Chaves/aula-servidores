import { createHash } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

// Valor fixo da RFC 6455: todo servidor WebSocket usa o mesmo.
export const GUID_WEBSOCKET = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

// Sec-WebSocket-Accept = base64( SHA-1( Sec-WebSocket-Key + GUID ) ).
// O navegador confere a conta: prova que quem respondeu entende WebSocket,
// e nao e um servidor HTTP qualquer (ou um cache) devolvendo uma resposta velha.
export function calcularAccept(chave: string) {
	const concatenado = chave + GUID_WEBSOCKET;
	const sha1 = createHash('sha1').update(concatenado).digest();

	return { concatenado, sha1: sha1.toString('hex'), accept: sha1.toString('base64') };
}

function separar(linha: string): [string, string] {
	const i = linha.indexOf(':');

	return [linha.slice(0, i), linha.slice(i + 1).trim()];
}

// O handshake como passou pelo servidor: a requisicao que chegou e a resposta 101 que saiu.
export function descreverHandshake(requisicao: IncomingMessage, resposta: string[]) {
	const cabecalhos: [string, string][] = [];

	// rawHeaders mantem a grafia e a ordem originais: [nome, valor, nome, valor, ...]
	for (let i = 0; i < requisicao.rawHeaders.length; i += 2) {
		cabecalhos.push([requisicao.rawHeaders[i], requisicao.rawHeaders[i + 1]]);
	}

	const chave = String(requisicao.headers['sec-websocket-key'] ?? '');

	return {
		requisicao: { linha: `${requisicao.method} ${requisicao.url} HTTP/${requisicao.httpVersion}`, cabecalhos },
		resposta: { linha: resposta[0] ?? '', cabecalhos: resposta.slice(1).filter(Boolean).map(separar) },
		calculo: { chave, guid: GUID_WEBSOCKET, ...calcularAccept(chave) },
	};
}
