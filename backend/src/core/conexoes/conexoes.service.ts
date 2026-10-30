import { BeforeApplicationShutdown, Injectable, Logger } from '@nestjs/common';
import type { WebSocket, WebSocketServer } from 'ws';
import { manterVivo } from '@shared/ws/heartbeat';

// Cada gateway tem o seu servidor WebSocket (um por caminho: /ws/chat, /ws/jogo...).
// Este service acompanha todos: conta as conexoes abertas e liga o heartbeat.
@Injectable()
export class ConexoesService implements BeforeApplicationShutdown {
	private readonly logger = new Logger('WebSocket');
	private readonly servidores = new Map<string, WebSocketServer>();

	acompanhar(canal: string, servidor: WebSocketServer) {
		this.servidores.set(canal, servidor);
		manterVivo(servidor);

		servidor.on('connection', (cliente: WebSocket) => {
			this.logger.log(`${canal}: conexao aberta (${servidor.clients.size} abertas)`);

			cliente.on('close', (codigo: number, motivo: Buffer) => {
				const texto = motivo.length ? `, motivo "${motivo.toString()}"` : '';

				this.logger.log(`${canal}: conexao fechada, codigo ${codigo}${texto} (${servidor.clients.size} abertas)`);
			});
		});
	}

	contagem() {
		return Object.fromEntries([...this.servidores].map(([canal, servidor]) => [canal, servidor.clients.size]));
	}

	// docker compose restart/stop: antes de desligar, avisa cada navegador com um close 1001
	// ("indo embora"). Sem isso, o Nest derruba as conexoes sem frame de close e chega 1006.
	async beforeApplicationShutdown() {
		for (const servidor of this.servidores.values()) {
			for (const cliente of servidor.clients) {
				cliente.close(1001, 'o servidor está reiniciando');
			}
		}

		await new Promise((resolve) => setTimeout(resolve, 300));
	}
}
