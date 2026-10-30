import { handle } from '../lib/game.mjs';

export default async (req) => handle(req);

export const config = { path: '/api/*' };
