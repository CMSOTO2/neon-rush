'worklet';

import { WORLD } from '../config';
import { speedAt } from '../levels/difficulty';
import { checkCollisions } from '../systems/collisionSystem';
import { updateParticles } from '../systems/particleSystem';
import { updatePlayer } from '../systems/playerSystem';
import { updateSpawner } from '../systems/spawnSystem';
import { GameEvent, Phase, type GameState } from '../types';

// Advances the simulation by one frame. Rendering reads the state afterwards.
export function stepGame(state: GameState, frameDt: number): void {
  if (state.paused) return;
  const dt = Math.min(frameDt, WORLD.maxFrameDt);
  state.time += dt;

  if (state.phase === Phase.Running) {
    state.speed = speedAt(state.distance);
    // Substep so a fast frame can't carry the player through a thin barrier.
    const steps = Math.max(1, Math.ceil((state.speed * dt) / WORLD.maxSubstepDistance));
    const h = dt / steps;
    for (let i = 0; i < steps && state.phase === Phase.Running; i++) {
      const prevDistance = state.distance;
      const prevX = state.player.x;
      state.distance += state.speed * h;
      updatePlayer(state, h);
      checkCollisions(state, prevDistance, prevX);
    }
    updateSpawner(state);
    state.stats.distance = state.distance;
    state.stats.score = Math.floor(state.distance);
  } else if (state.phase === Phase.Crashing) {
    state.crashTime += dt;
    state.speed = 0;
    updatePlayer(state, dt);
    if (state.crashTime >= WORLD.crashDuration) {
      state.phase = Phase.Over;
      state.events |= GameEvent.GameOver;
    }
  } else {
    updatePlayer(state, dt);
  }

  updateParticles(state, dt);
  state.shake = Math.max(0, state.shake - dt * 2.5);
  const camTarget = state.player.x * 0.55;
  state.camX += (camTarget - state.camX) * (1 - Math.exp(-8 * dt));
}
