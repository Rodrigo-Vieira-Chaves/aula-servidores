import { BadRequestException, Injectable, OnModuleDestroy } from '@nestjs/common';
import type { WebSocket } from 'ws';
import { enviar, transmitir } from '@shared/ws/enviar';

type Jogador = { id: number; nome: string; cor: string; x: number; direcao: number };

const LARGURA = 100; // a pista vai de 0 a 100
const VELOCIDADE = 1; // quanto um jogador anda por tick
const TICK_MS = 50; // 20 atualizacoes por segundo
const CORES = ['#2f6fdf', '#e0782a', '#15803d', '#c2367a', '#8a4fd6', '#0e8a7e', '#c27c0e', '#c62828', '#0e7490', '#6b7280'];

// O servidor e o dono do estado do jogo. O navegador so diz para onde quer ir;
// quanto anda, e se pode andar, quem decide e o servidor. Assim ninguem trapaceia
// mandando "estou no x = 100" pelo console.
@Injectable()
export class JogoService implements OnModuleDestroy {
	// Todo mundo com a pagina aberta, inclusive quem so esta assistindo.
	private readonly conectados = new Set<WebSocket>();
	private readonly jogadores = new Map<WebSocket, Jogador>();
	private ultimoId = 0;
	private mudou = false;
	private readonly tick = setInterval(() => this.avancar(), TICK_MS);

	assistir(cliente: WebSocket) {
		this.conectados.add(cliente);
		enviar(cliente, 'estado', this.estado());
	}

	entrar(cliente: WebSocket, nome: unknown) {
		const apelido = (typeof nome === 'string' ? nome.trim().slice(0, 16) : '') || `Jogador ${this.ultimoId + 1}`;
		const existente = this.jogadores.get(cliente);

		if (existente) {
			existente.nome = apelido;
		} else {
			const id = ++this.ultimoId;
			const x = Math.round(Math.random() * LARGURA);

			this.jogadores.set(cliente, { id, nome: apelido, cor: CORES[(id - 1) % CORES.length], x, direcao: 0 });
		}

		this.mudou = true;

		return { id: this.jogadores.get(cliente)!.id };
	}

	sair(cliente: WebSocket) {
		this.conectados.delete(cliente);

		if (this.jogadores.delete(cliente)) {
			this.mudou = true;
		}
	}

	// -1 = esquerda, 0 = parado, 1 = direita. O navegador manda so quando muda
	// (apertou ou soltou a tecla), e nao a cada passo.
	mover(cliente: WebSocket, direcao: unknown) {
		const jogador = this.jogadores.get(cliente);

		if (!jogador) {
			throw new BadRequestException('Entre no jogo antes de se mexer');
		}

		jogador.direcao = Math.sign(Number(direcao)) || 0;
	}

	// O "tick": a cada 50 ms o servidor move quem esta andando e manda o estado novo.
	// Se ninguem se mexeu, nao sai nenhum frame.
	private avancar() {
		for (const jogador of this.jogadores.values()) {
			if (!jogador.direcao) {
				continue;
			}

			const x = Math.min(LARGURA, Math.max(0, jogador.x + jogador.direcao * VELOCIDADE));

			if (x !== jogador.x) {
				jogador.x = x;
				this.mudou = true;
			}
		}

		if (!this.mudou) {
			return;
		}

		this.mudou = false;
		transmitir(this.conectados, 'estado', this.estado());
	}

	private estado() {
		return { jogadores: [...this.jogadores.values()].map(({ id, nome, cor, x }) => ({ id, nome, cor, x })) };
	}

	onModuleDestroy() {
		clearInterval(this.tick);
	}
}
