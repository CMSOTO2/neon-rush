'worklet';

import { COINS, PLAYER, POOL_SIZES, POWER } from '../config';
import { GameEvent, PowerUpKind, type GameState } from '../types';
import { burstSparkles } from './particleSystem';
import { playerHeight } from './playerSystem';
import { scoreMultiplier } from './powerUpSystem';

export function updateCoins(state: GameState, dt: number): void {
  const p = state.player;
  const d = state.distance;
  const bottom = p.y - 0.3;
  const top = p.y + playerHeight(state) + 0.35;
  const magnet = state.power[PowerUpKind.Magnet] > 0;
  const pull = (POWER.magnetPull + state.speed) * dt;
  const pool = state.coins;

  for (let i = 0; i < POOL_SIZES.coins; i++) {
    const c = pool[i];
    if (!c.active) continue;

    if (c.collected) {
      c.collectTime += dt;
      // Ride along with the runner while popping.
      c.z += state.speed * dt;
      if (c.collectTime >= COINS.popTime) c.active = false;
      continue;
    }

    if (magnet && !c.magnet && c.z > d - 1 && c.z - d < POWER.magnetRange) c.magnet = true;
    if (c.magnet) {
      const tx = p.x - c.x;
      const ty = p.y + PLAYER.standHeight * 0.55 - c.y;
      const tz = d + 0.3 - c.z;
      const len = Math.sqrt(tx * tx + ty * ty + tz * tz);
      if (len > 0.001) {
        const step = Math.min(len, pull);
        c.x += (tx / len) * step;
        c.y += (ty / len) * step;
        c.z += (tz / len) * step;
      }
    }

    if (Math.abs(c.z - d) > COINS.pickupReachZ) continue;
    if (Math.abs(c.x - p.x) > COINS.pickupReachX) continue;
    if (c.y < bottom || c.y > top) continue;

    c.collected = true;
    c.collectTime = 0;
    state.stats.coins++;
    state.scoreAcc += COINS.value * scoreMultiplier(state);
    p.collectFlash = 0.15;
    state.events |= GameEvent.Coin;
    burstSparkles(state, c.x, c.y, c.z, 3);
  }
}
