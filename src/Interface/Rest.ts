import { FilterOptions } from './Player';
import { LavalinkLoadType } from './Constants';
import { Exception } from './LavalinkEvents';

export interface RainlinkRequesterOptions extends RequestInit {
  params?: string | Record<string, string>;
  useSessionId?: boolean;
  data?: Record<string, unknown>;
  path: string;
}

export interface LavalinkPlayer {
  guildId: string;
  track?: RawTrack;
  volume: number;
  paused: boolean;
  voice: LavalinkPlayerVoice;
  filters: FilterOptions;
}

export interface RawTrack {
  encoded: string;
  info: {
    identifier: string;
    isSeekable: boolean;
    author: string;
    length: number;
    isStream: boolean;
    position: number;
    title: string;
    uri?: string;
    artworkUrl?: string;
    isrc?: string;
    sourceName: string;
  };
  pluginInfo: unknown;
}

export interface LavalinkPlayerVoice {
  token: string;
  endpoint: string;
  sessionId: string;
  connected?: boolean;
  ping?: number;
}

export interface LavalinkPlayerVoiceOptions extends Omit<LavalinkPlayerVoice, 'connected' | 'ping'> {}

export interface LavalinkPlayer {
  guildId: string;
  track?: RawTrack;
  volume: number;
  paused: boolean;
  voice: LavalinkPlayerVoice;
  filters: FilterOptions;
}

export interface UpdatePlayerTrack {
  encoded?: string | null;
  identifier?: string;
  userData?: Record<string, any>;
}

export interface UpdatePlayerOptions {
  track?: UpdatePlayerTrack;
  identifier?: string;
  position?: number;
  endTime?: number;
  volume?: number;
  paused?: boolean;
  filters?: FilterOptions;
  voice?: LavalinkPlayerVoiceOptions;
}

export interface UpdatePlayerInfo {
  guildId: string;
  playerOptions: UpdatePlayerOptions;
  noReplace?: boolean;
}

export interface TrackResult {
  loadType: LavalinkLoadType.TRACK;
  data: RawTrack;
}

export interface PlaylistResult {
  loadType: LavalinkLoadType.PLAYLIST;
  data: Playlist;
}

export interface SearchResult {
  loadType: LavalinkLoadType.SEARCH;
  data: RawTrack[];
}

export interface EmptyResult {
  loadType: LavalinkLoadType.EMPTY;
  data: Record<string, never>;
}

export interface ErrorResult {
  loadType: LavalinkLoadType.ERROR;
  data: Exception;
}

export interface Playlist {
  encoded: string;
  info: {
    name: string;
    selectedTrack: number;
  };
  pluginInfo: unknown;
  tracks: RawTrack[];
}

export type LavalinkResponse = TrackResult | PlaylistResult | SearchResult | EmptyResult | ErrorResult;
