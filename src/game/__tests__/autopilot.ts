import { LANE_COUNT, PLAYER } from '../config';
import { applyAction } from '../systems/playerSystem';
import { Action, ObstacleKind, type GameState, type Obstacle } from '../types';

// A simple perfect-information bot. It exists to prove the generator is fair: if a
// straightforward policy survives long runs across many seeds, no row is impossible.

// Where a tram's near face will be when the runner reaches it, accounting for oncoming
// trams closing the distance.
function effectiveZ(state: GameState, z: number, vz: number): number {
  const d = state.distance;
  return d + ((z - d) * state.speed) / (state.speed - vz);
}

function laneBlockedByTram(state: GameState, lane: number, from: number, to: number): boolean {
  for (const o of state.obstacles) {
    if (!o.active || o.lane !== lane || o.kind !== ObstacleKind.Tram) continue;
    const z0 = effectiveZ(state, o.z0, o.vz);
    const z1 = z0 + (o.z1 - o.z0);
    if (z1 > from && z0 < to) return true;
  }
  return false;
}

function nextInLane(state: GameState, lane: number): Obstacle | null {
  const back = state.distance - PLAYER.halfDepth;
  let best: Obstacle | null = null;
  for (const o of state.obstacles) {
    if (!o.active || o.lane !== lane || o.z1 <= back) continue;
    if (!best || o.z0 < best.z0) best = o;
  }
  return best;
}

function actOn(state: GameState, lane: number): boolean {
  const p = state.player;
  const o = nextInLane(state, lane);
  if (!o || o.kind === ObstacleKind.Tram) return false;
  const gap = o.z0 - (state.distance + PLAYER.halfDepth);
  if (gap <= 0 || gap > state.speed * 0.3) return false;
  if ((o.kind === ObstacleKind.Barrier || o.kind === ObstacleKind.Gap) && gap < state.speed * 0.2) {
    if (p.grounded) applyAction(state, Action.Jump);
    return true;
  }
  if (o.kind === ObstacleKind.Gate) {
    if (!p.sliding) applyAction(state, Action.Slide);
    return true;
  }
  return true;
}

export function autopilot(state: GameState): void {
  const p = state.player;
  const d = state.distance;
  const look = state.speed * 1.1 + 4;

  // Deal with whatever is right in front first; players can jump or slide mid lane change.
  if (actOn(state, p.targetLane)) return;
  if (p.lane !== p.targetLane && actOn(state, p.lane)) return;

  // Then pick the nearest lane with no tram coming up, reachable without crossing a tram.
  const current = p.targetLane;
  if (!laneBlockedByTram(state, current, d - 1, d + look) || p.lane !== p.targetLane) return;
  for (let offset = 1; offset < LANE_COUNT; offset++) {
    for (const dir of [-1, 1]) {
      const lane = current + dir * offset;
      if (lane < 0 || lane >= LANE_COUNT) continue;
      if (laneBlockedByTram(state, lane, d - 1, d + look)) continue;
      // Don't swerve into (or through) a barrier or gate that's too close to react to.
      let clear = true;
      for (let l = Math.min(lane, current); l <= Math.max(lane, current); l++) {
        if (l === current) continue;
        const next = nextInLane(state, l);
        if (next && next.z0 - d < state.speed * 0.4) clear = false;
        if (l !== lane && laneBlockedByTram(state, l, d - 1, d + 3)) clear = false;
      }
      if (!clear) continue;
      applyAction(state, lane < current ? Action.Left : Action.Right);
      return;
    }
  }
}
