import { RainlinkNodeOptions } from '../Interface/Manager';
import { Rainlink } from '../Rainlink';
import { metadata } from '../metadata';
import { LavalinkLoadType, RainlinkEvents } from '../Interface/Constants';
import { RainlinkRequesterOptions } from '../Interface/Rest';
import { RainlinkNode } from '../Node/RainlinkNode';
import { AbstractDriver } from './AbstractDriver';
import { RainlinkPlayer } from '../Player/RainlinkPlayer';
import util from 'node:util';
import { RainlinkWebsocket } from '../Node/RainlinkWebsocket';

export enum Nodelink2loadType {
  SHORTS = 'shorts',
  ALBUM = 'album',
  ARTIST = 'artist',
  SHOW = 'show',
  EPISODE = 'episode',
  STATION = 'station',
  PODCAST = 'podcast',
}

export interface NodelinkGetLyricsInterface {
  loadType: Nodelink2loadType | LavalinkLoadType;
  data:
    | {
        name: string;
        synced: boolean;
        data: {
          startTime: number;
          endTime: number;
          text: string;
        }[];
        rtl: boolean;
      }
    | Record<string, never>;
}

export class Nodelink2 extends AbstractDriver {
	public id: string = 'nodelink@2';
	public wsUrl: string = '';
	public httpUrl: string = '';
	public sessionId: string | null;
	public functions: Map<string, (player: RainlinkPlayer, ...args: any) => unknown>;
	private wsClient?: RainlinkWebsocket;
	public manager: Rainlink | null = null;
	public options: RainlinkNodeOptions | null = null;
	public node: RainlinkNode | null = null;

	constructor() {
		super();
		this.sessionId = null;
		this.functions = new Map<string, (player: RainlinkPlayer, ...args: any) => unknown>();
		this.functions.set('getLyric', this.getLyric);
	}

	public get isRegistered(): boolean {
		return (
			this.manager !== null &&
      this.options !== null &&
      this.node !== null &&
      this.wsUrl.length !== 0 &&
      this.httpUrl.length !== 0
		);
	}

	public initial(manager: Rainlink, options: RainlinkNodeOptions, node: RainlinkNode): void {
		this.manager = manager;
		this.options = options;
		this.node = node;
		this.wsUrl = `${options.secure ? 'wss' : 'ws'}://${options.host}:${options.port}/v3/websocket`;
		this.httpUrl = `${options.secure ? 'https://' : 'http://'}${options.host}:${options.port}/v3`;
	}

	public connect(): RainlinkWebsocket {
		if (!this.isRegistered) throw new Error(`Driver ${this.id} not registered by using initial()`);
		const isResume = this.manager!.rainlinkOptions.options!.resume;
		const ws = new RainlinkWebsocket(this.wsUrl, {
			headers: {
				Authorization: this.options!.auth,
				'User-Id': this.manager!.id,
				'Client-Name': `${metadata.name}/${metadata.version} (${metadata.github})`,
				'Session-Id': this.sessionId !== null && isResume ? this.sessionId : '',
				'user-agent': this.manager!.rainlinkOptions.options!.userAgent!,
			},
		});

		ws.on('open', () => {
      this.node!.wsOpenEvent();
		});
		ws.on('message', data => this.wsMessageEvent(data));
		ws.on('error', err => this.node!.wsErrorEvent(err));
		ws.on('close', (code: number, reason: Buffer) => {
      this.node!.wsCloseEvent(code, reason);
      ws.removeAllListeners();
		});
		this.wsClient = ws;
		return ws;
	}

	public async requester<D = any>(options: RainlinkRequesterOptions): Promise<D | undefined> {
		if (!this.isRegistered) throw new Error(`Driver ${this.id} not registered by using initial()`);
		if (options.useSessionId && this.sessionId == null)
			throw new Error('sessionId not initalized! Please wait for lavalink get connected!');
		const url = new URL(`${this.httpUrl}${options.path}`);
		if (options.params) url.search = new URLSearchParams(options.params).toString();

		if (options.data) {
			options.body = JSON.stringify(options.data);
		}

		const lavalinkHeaders = {
			Authorization: this.options!.auth,
			'User-Agent': this.manager!.rainlinkOptions.options!.userAgent!,
			...options.headers,
		};

		options.headers = lavalinkHeaders;
		options.path = url.pathname + url.search;

		const res = await fetch(url.origin + options.path, options);

		// this.debug(`Request URL: ${url.origin}${options.path}`);

		if (res.status == 204) {
			this.debug('Player now destroyed');
			return undefined;
		}
		if (res.status !== 200) {
			this.debug(
				'Something went wrong with lavalink server. ' +
          `Status code: ${res.status}\n Headers: ${util.inspect(options.headers)}`,
			);
			return undefined;
		}

		const preFinalData = (await res.json()) as D;
		let finalData: any = preFinalData;

		if (finalData.loadType) {
			finalData = this.convertV4trackResponse(finalData) as D;
		}

		this.debug(`${options.method} ${options.path}`);

		return finalData;
	}

	protected wsMessageEvent(data: string) {
		if (!this.isRegistered) throw new Error(`Driver ${this.id} not registered by using initial()`);
		const wsData = JSON.parse(data.toString());
    this.node!.wsMessageEvent(wsData);
	}

	private debug(logs: string) {
		if (!this.isRegistered) throw new Error(`Driver ${this.id} not registered by using initial()`);
    this.manager!.emit(RainlinkEvents.Debug, `[Nodelink2 Driver]: ${logs}`);
	}

	public wsClose(): void {
		if (this.wsClient) this.wsClient.close(1006, 'Self closed');
	}

	protected convertV4trackResponse(nl2Data: Record<string, any>): Record<string, any> {
		if (!nl2Data) return {};
		switch (nl2Data.loadType) {
		case Nodelink2loadType.SHORTS: {
			nl2Data.loadType = LavalinkLoadType.TRACK;
			break;
		}
		case Nodelink2loadType.ALBUM: {
			nl2Data.loadType = LavalinkLoadType.PLAYLIST;
			break;
		}
		case Nodelink2loadType.ARTIST: {
			nl2Data.loadType = LavalinkLoadType.SEARCH;
			break;
		}
		case Nodelink2loadType.EPISODE: {
			nl2Data.loadType = LavalinkLoadType.PLAYLIST;
			break;
		}
		case Nodelink2loadType.STATION: {
			nl2Data.loadType = LavalinkLoadType.PLAYLIST;
			break;
		}
		case Nodelink2loadType.PODCAST: {
			nl2Data.loadType = LavalinkLoadType.PLAYLIST;
			break;
		}
		case Nodelink2loadType.SHOW: {
			nl2Data.loadType = LavalinkLoadType.PLAYLIST;
			break;
		}
		default: {
			nl2Data.loadType = LavalinkLoadType.TRACK;
			break;
		}
		}
		return nl2Data;
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public async updateSession(sessionId: string, mode: boolean, timeout: number): Promise<void> {
		this.debug(
			'[WARNING]: Nodelink doesn\'t support resuming, set resume to true is useless in Nodelink2 driver',
		);
		return;
	}

	public async getLyric(
		player: RainlinkPlayer,
		language: string,
	): Promise<NodelinkGetLyricsInterface | undefined> {
		const options: RainlinkRequesterOptions = {
			path: '/loadlyrics',
			params: {
				encodedTrack: String(player.queue.current?.encoded),
				language: language,
			},
			useSessionId: false,
			headers: { 'Content-Type': 'application/json' },
			method: 'GET',
		};
		const data = await player.node.driver.requester<NodelinkGetLyricsInterface>(options);
		return data;
	}

	protected testJSON(text: string) {
		if (typeof text !== 'string') {
			return false;
		}
		try {
			JSON.parse(text);
			return true;
		} catch (error) {
			return false;
		}
	}
}
