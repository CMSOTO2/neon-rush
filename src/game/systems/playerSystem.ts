'worklet';

import { LANE_COUNT, LANE_WIDTH, laneX, PLAYER } from '../config';
import { Action, GameEvent, Phase, type GameState } from '../types';
import { fxRandom } from '../engine/random';
import { burstDust, emitSparks } from './particleSystem';

function startJump(state: GameState): void {
  const p = state.player;
  p.sliding = false;
  p.slideTime = 0;
  p.slideAfterLanding = false;
  p.grounded = false;
  p.vy = PLAYER.jumpVelocity;
  p.airTime = 0;
  p.jumpBuffer = 0;
  state.stats.jumps++;
  state.events |= GameEvent.Jump;
}

function startSlide(state: GameState): void {
  const p = state.player;
  if (!p.sliding) state.stats.slides++;
  p.sliding = true;
  p.slideTime = PLAYER.slideDuration;
  state.events |= GameEvent.Slide;
}

// Called from the swipe gesture on the UI thread, so input takes effect on the next frame.
export function applyAction(state: GameState, action: Action): void {
  if (state.phase !== Phase.Running || state.paused) return;
  const p = state.player;

  switch (action) {
    case Action.Left:
    case Action.Right: {
      const dir = action === Action.Left ? -1 : 1;
      const next = p.targetLane + dir;
      if (next < 0 || next >= LANE_COUNT) return;
      p.prevLane = p.targetLane;
      p.targetLane = next;
      state.events |= GameEvent.Lane;
      return;
    }
    case Action.Jump:
      if (p.grounded) startJump(state);
      else p.jumpBuffer = PLAYER.jumpBufferTime;
      return;
    case Action.Slide:
      if (p.grounded) {
        startSlide(state);
      } else {
        // Slam down and slide on touchdown.
        p.vy = Math.min(p.vy, PLAYER.fastFallVelocity);
        p.slideAfterLanding = true;
        p.jumpBuffer = 0;
      }
      return;
  }
}

export function updatePlayer(state: GameState, dt: number): void {
  const p = state.player;

  if (state.phase === Phase.Ready) {
    p.idleTime += dt;
    return;
  }

  // Lane movement: exponential approach feels snappy and never overshoots.
  const targetX = laneX(p.targetLane);
  const prevX = p.x;
  const k = 1 - Math.exp(-PLAYER.laneChangeRate * dt);
  p.x += (targetX - p.x) * k;
  if (Math.abs(targetX - p.x) < 0.01) {
    p.x = targetX;
    p.lane = p.targetLane;
  } else {
    p.lane = Math.round(p.x / LANE_WIDTH + (LANE_COUNT - 1) / 2);
  }
  p.vx = dt > 0 ? (p.x - prevX) / dt : 0;

  if (state.phase === Phase.Crashing) {
    // Knock-back arc; no further control.
    if (!p.grounded) {
      p.vy -= PLAYER.gravity * dt;
      p.y += p.vy * dt;
      if (p.y <= 0) {
        p.y = 0;
        p.vy = 0;
        p.grounded = true;
      }
    }
    return;
  }

  if (p.stumbleTime > 0) p.stumbleTime = Math.max(0, p.stumbleTime - dt);
  if (p.landSquash > 0) p.landSquash = Math.max(0, p.landSquash - dt);
  if (p.jumpBuffer > 0) p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);

  if (!p.grounded) {
    p.airTime += dt;
    p.vy -= PLAYER.gravity * dt;
    p.y += p.vy * dt;
    if (p.y <= 0) {
      p.y = 0;
      p.vy = 0;
      p.grounded = true;
      p.landSquash = PLAYER.landSquashTime;
      state.events |= GameEvent.Land;
      burstDust(state, p.x, state.distance, 5);
      if (p.jumpBuffer > 0) {
        startJump(state);
      } else if (p.slideAfterLanding) {
        p.slideAfterLanding = false;
        startSlide(state);
      }
    }
  }

  if (p.sliding) {
    p.slideTime -= dt;
    if (p.slideTime <= 0) {
      p.sliding = false;
      p.slideTime = 0;
    } else if (fxRandom(state) < dt * 30) {
      emitSparks(state, p.x, state.distance);
    }
  }

  // Stride rate follows run speed so feet don't skate.
  p.runPhase += dt * state.speed * 0.85;
}

export function playerHeight(state: GameState): number {
  return state.player.sliding ? PLAYER.slideHeight : PLAYER.standHeight;
}
