'worklet';

import { POOL_SIZES, POWER, WORLD } from '../config';
import { effectiveDistance, speedAt } from '../levels/difficulty';
import { updateCoins } from '../systems/coinSystem';
import { checkCollisions } from '../systems/collisionSystem';
import { updateMissions } from '../systems/missionSystem';
import { burstSparkles, updateParticles } from '../systems/particleSystem';
import { updatePlayer } from '../systems/playerSystem';
import { scoreMultiplier, updatePowerUps } from '../systems/powerUpSystem';
import { updateSpawner } from '../systems/spawnSystem';
import { updateTutorial } from '../systems/tutorialSystem';
import { GameEvent, GameMode, Phase, PowerUpKind, type GameState } from '../types';

function moveObstacles(state: GameState, dt: number): void {
  const pool = state.obstacles;
  for (let i = 0; i < POOL_SIZES.obstacles; i++) {
    const o = pool[i];
    if (!o.active || o.vz === 0) continue;
    o.z0 += o.vz * dt;
    o.z1 += o.vz * dt;
  }
}

// Advances the simulation by one frame. Rendering reads the state afterwards.
export function stepGame(state: GameState, frameDt: number): void {
  if (state.paused) return;
  const dt = Math.min(frameDt, WORLD.maxFrameDt);
  // The tutorial freezes the whole scene on a hint until the player makes the move.
  if (state.phase === Phase.Running) {
    updateTutorial(state, dt);
    if (state.tutorialHold >= 0) return;
  }
  state.time += dt;

  if (state.phase === Phase.Running) {
    // Ease toward the target speed so boosts ramp up and down instead of snapping.
    const base = speedAt(effectiveDistance(state, state.distance));
    const target = state.power[PowerUpKind.Boost] > 0 ? base * POWER.boostSpeedFactor : base;
    state.speed += (target - state.speed) * (1 - Math.exp(-4 * dt));

    // Substep so a fast frame can't carry the player through a thin barrier.
    const steps = Math.max(1, Math.ceil((state.speed * dt) / WORLD.maxSubstepDistance));
    const h = dt / steps;
    const mult = scoreMultiplier(state);
    for (let i = 0; i < steps && state.phase === Phase.Running; i++) {
      const prevDistance = state.distance;
      const prevX = state.player.x;
      const step = state.speed * h;
      state.distance += step;
      state.scoreAcc += step * mult;
      state.stats.cleanDistance += step;
      if (state.stats.cleanDistance > state.stats.bestCleanDistance) {
        state.stats.bestCleanDistance = state.stats.cleanDistance;
      }
      moveObstacles(state, h);
      updatePlayer(state, h);
      checkCollisions(state, prevDistance, prevX, h);
    }
    if (state.phase === Phase.Running) {
      updatePowerUps(state, dt);
      updateCoins(state, dt);
    }
    updateSpawner(state);
    state.stats.distance = state.distance;
    state.stats.score = Math.floor(state.scoreAcc);

    // Crossing the finish line ends a level.
    if (
      state.mode === GameMode.Level &&
      state.phase === Phase.Running &&
      state.distance >= state.levelLength
    ) {
      state.phase = Phase.Complete;
      state.crashTime = 0;
      state.events |= GameEvent.LevelComplete;
      for (let i = 0; i < 4; i++) {
        burstSparkles(state, state.player.x + (i - 1.5), 2 + i * 0.3, state.distance + 4, 10);
      }
    }
  } else if (state.phase === Phase.Complete) {
    // Coast to a stop past the arch, still collecting nothing and hitting nothing.
    state.crashTime += dt;
    state.speed *= Math.exp(-2.5 * dt);
    state.distance += state.speed * dt;
    updatePlayer(state, dt);
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
  updateMissions(state, dt);

  // Sample the trail every half meter so its points line up with how it's drawn.
  const tx = state.trailX;
  const ty = state.trailY;
  if (state.distance - state.trailAt >= 0.5) {
    state.trailAt = state.distance;
    for (let i = tx.length - 1; i > 0; i--) {
      tx[i] = tx[i - 1];
      ty[i] = ty[i - 1];
    }
  }
  tx[0] = state.player.x;
  ty[0] = state.player.y;

  updateParticles(state, dt);
  state.shake = Math.max(0, state.shake - dt * 2.5);
  const camTarget = state.player.x * 0.55;
  state.camX += (camTarget - state.camX) * (1 - Math.exp(-8 * dt));
  // Lift the camera while flying so the runner stays framed.
  const liftTarget = state.player.flying ? state.player.y * 0.55 : 0;
  state.camLift += (liftTarget - state.camLift) * (1 - Math.exp(-3 * dt));
  const menuTarget = state.phase === Phase.Ready ? 1 : 0;
  state.menuLift += (menuTarget - state.menuLift) * (1 - Math.exp(-5 * dt));
}
