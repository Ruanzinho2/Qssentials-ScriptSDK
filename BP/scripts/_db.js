import { QuickDB as Database } from './extension/quick-db.js';

export const PlayerDB = new Database('player-db');
export const ScorehudDB = new Database('scorehud-db', 1);
export const HomeDB = new Database('home-db');
export const FactionDB = new Database('faction-db');
export const LandDB = new Database('land-db');
export const WarpDB = new Database('warp-db');
export const QuestDB = new Database('quest-db');