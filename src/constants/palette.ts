// Environments. Each supplies a palette with the same keys plus a scenery style and a
// ride; the renderer reads only these. Neon City is drawn by rendering/drawEnvironment.ts
// and drawObstacles.ts; every other world has its own module in rendering/worlds/ that
// re-skins the same obstacle kinds (same hitboxes, same move cues) to fit the place.

export type Scenery = 'city' | 'beach' | 'snow';

// How the runner travels: on foot, or standing on a surfboard or snowboard.
export type Ride = 'run' | 'surf' | 'snowboard';

export type EnvironmentPalette = {
  scenery: Scenery;
  ride: Ride;
  // Landing dust or spray, and the particles thrown up while sliding.
  dust: string;
  spark: string;
  // Extra named colours for the world's own drawers (rendering/worlds/).
  theme: Record<string, string>;
  // Laser gate beam. Picked per world so it keeps at least 3:1 contrast against that
  // world's road and sky for normal, protan, deutan and tritan vision.
  // `arrow` is the slide hint drawn on the beam, so it must stand out against `fill`.
  gateBeam: { fill: string; edge: string; glow: string; arrow: string };
  // Ground gradient: at the horizon, just below it, and at the bottom of the screen.
  groundHorizon: string;
  groundBottom: string;
  skyTop: string;
  skyMid: string;
  skyHorizon: string;
  horizonGlow: string;
  sunTop: string;
  sunBottom: string;
  stars: string;
  skyline: string;
  ground: string;
  groundGrid: string;
  road: string;
  roadFar: string;
  roadSeam: string;
  laneDash: string;
  roadEdge: string;
  roadEdgeGlow: string;
  buildings: string[];
  windows: string[];
};

export const NEON_CITY: EnvironmentPalette = {
  scenery: 'city',
  ride: 'run',
  dust: '#5ef2ff',
  spark: '#ffd84a',
  theme: {},
  gateBeam: { fill: '#ff6b9d', edge: '#ffd1e3', glow: '#ff6b9d', arrow: '#ffffff' },
  groundHorizon: '#3a1466',
  groundBottom: '#0a0418',
  skyTop: '#140a33',
  skyMid: '#4a1780',
  skyHorizon: '#ff4fa3',
  horizonGlow: '#ffb14a',
  sunTop: '#ffe66b',
  sunBottom: '#ff3d8b',
  stars: '#ffffff',
  skyline: '#2a1060',
  ground: '#12082b',
  groundGrid: '#b04dff',
  road: '#2a1a57',
  roadFar: '#3d2475',
  roadSeam: '#1c1040',
  laneDash: '#7af7ff',
  roadEdge: '#ff4fd8',
  roadEdgeGlow: '#ff4fd8',
  buildings: ['#2b1c63', '#35227a', '#1f2b6e', '#3a1f66'],
  windows: ['#5ef2ff', '#ff6ad5', '#ffd84a', '#a6ff4d'],
};

// Neon surf at dusk: a dark sea so the lights pop, a glowing current for the lane between
// two magenta float ropes, sand, palms and lit huts on the left, and rocks, sailboats and
// a lighthouse out to sea on the right. Every world keeps the Neon Rush look: dark
// ground, glowing edges, emissive trims.
export const SUNSET_BEACH: EnvironmentPalette = {
  scenery: 'beach',
  ride: 'surf',
  dust: '#9ff6ff',
  spark: '#9ff6ff',
  // Unused here (the beach has a pier instead of lasers) but kept for the shared shape.
  gateBeam: { fill: '#b5fbff', edge: '#ffffff', glow: '#b5fbff', arrow: '#3b1d6e' },
  // The sea picks up the sunset at the horizon and darkens toward the camera.
  groundHorizon: '#c2508a',
  groundBottom: '#060a2e',
  skyTop: '#2b1055',
  skyMid: '#d6457a',
  skyHorizon: '#ff9e5e',
  horizonGlow: '#ffd27a',
  sunTop: '#fff2a8',
  sunBottom: '#ff6a3d',
  stars: '#fff4d6',
  skyline: '#5a2a6e',
  ground: '#12306e',
  groundGrid: '#9ff6ff',
  // The surf lane: a glowing current.
  road: '#1d6fae',
  roadFar: '#4a8fd0',
  roadSeam: '#9ff6ff',
  laneDash: '#5ef2ff',
  roadEdge: '#ff4fd8',
  roadEdgeGlow: '#ff4fd8',
  // Beach huts and their lights.
  buildings: ['#2ee6c5', '#ff6a8a', '#ffd84a', '#7b5cff'],
  windows: ['#ffd84a', '#ff9e5e', '#fff4d6'],
  theme: {
    sand: '#c98f6a',
    wetSand: '#8a5a5a',
    foam: '#9ff6ff',
    neon: '#5ef2ff',
    neonHot: '#ff4fd8',
    wood: '#9a6440',
    woodDark: '#5e3a24',
    woodLight: '#c98e5e',
    buoy: '#ff6a3d',
    buoyDark: '#c9401c',
    stripe: '#ffffff',
    hull: '#f4f7ff',
    hullSide: '#b9c6de',
    hullTop: '#ffffff',
    hullStripe: '#ff4fd8',
    glass: '#1b3a5c',
    light: '#fffbd0',
    rock: '#4a3f5e',
    rockSide: '#352c47',
    rockTop: '#6e5f86',
    sail: '#fff4d6',
    whirl: '#050724',
    whirlMid: '#1a1466',
    lighthouse: '#ffffff',
    lighthouseBand: '#ff4f6d',
    board: '#ffd84a',
    boardStripe: '#ff4f8a',
    // The pier's warning board and its arrow: 3.5:1 or better against the lane for
    // normal, protan, deutan and tritan vision.
    sign: '#ffe14a',
    signInk: '#1a0b3a',
  },
};

// Snowboarding a night slope: a groomed piste with glowing cyan edges under a synth moon
// and an aurora, pines strung with lights, lit cabins and a ski lift on the banks.
export const SNOWY_MOUNTAIN: EnvironmentPalette = {
  scenery: 'snow',
  ride: 'snowboard',
  dust: '#eef4ff',
  spark: '#bff3ff',
  gateBeam: { fill: '#ff4fd8', edge: '#ffd1f3', glow: '#ff4fd8', arrow: '#ffffff' },
  groundHorizon: '#7a6fd6',
  groundBottom: '#10123a',
  skyTop: '#060a2a',
  skyMid: '#1b1f6b',
  skyHorizon: '#6a3fb5',
  horizonGlow: '#39e6ff',
  // A pale synth moon instead of the sunset sun.
  sunTop: '#f2fbff',
  sunBottom: '#7ad7ff',
  stars: '#ffffff',
  skyline: '#262a73',
  ground: '#343a8e',
  groundGrid: '#8a93e6',
  road: '#4e56b0',
  roadFar: '#7078cf',
  roadSeam: '#8a93e6',
  laneDash: '#bff3ff',
  roadEdge: '#39e6ff',
  roadEdgeGlow: '#39e6ff',
  // Cabins: dark timber; their windows glow.
  buildings: ['#3a2a5e', '#2f2450', '#43306b'],
  windows: ['#ffd84a', '#ff9e5e', '#5ef2ff'],
  theme: {
    snow: '#e4eaff',
    snowShade: '#aab4ee',
    pine: '#123a5e',
    pineDark: '#0b2440',
    trunk: '#3a2433',
    neon: '#39e6ff',
    neonHot: '#ff4fd8',
    ice: '#8feaff',
    iceSide: '#4fb8dc',
    iceTop: '#e8fdff',
    stripe: '#ffffff',
    pole: '#2a2f6e',
    poleTop: '#5b63b8',
    cat: '#ffb000',
    catSide: '#c98200',
    catTop: '#ffd45c',
    track: '#1b1d3a',
    glass: '#1b2a5c',
    light: '#fffbd0',
    crevasse: '#050720',
    crevasseGlow: '#39e6ff',
    roof: '#e4eaff',
    lift: '#8a93e6',
    aurora: '#6bff9e',
    board: '#ff4fd8',
    boardStripe: '#39e6ff',
    // Slalom banner and its arrow: 4.3:1 or better against the piste for all four
    // vision types (a magenta banner dropped to 1.7:1 for protans).
    banner: '#ffd1f3',
    bannerInk: '#1a0b3a',
  },
};

export type EnvironmentDef = {
  id: string;
  name: string;
  palette: EnvironmentPalette;
  // Player level needed to run here.
  unlockLevel: number;
};

export const ENVIRONMENTS: EnvironmentDef[] = [
  { id: 'city', name: 'Neon City', palette: NEON_CITY, unlockLevel: 1 },
  { id: 'beach', name: 'Sunset Beach', palette: SUNSET_BEACH, unlockLevel: 3 },
  { id: 'mountain', name: 'Snowy Mountain', palette: SNOWY_MOUNTAIN, unlockLevel: 10 },
];

export function getEnvironment(id: string): EnvironmentDef {
  return ENVIRONMENTS.find((e) => e.id === id) ?? ENVIRONMENTS[0];
}

// Obstacle materials: front, side and top shades so boxes read as 3D.
export const OBSTACLE_COLORS = {
  barrier: {
    front: '#ffc93c',
    side: '#d99a12',
    top: '#fff0a8',
    stripe: '#2a1640',
    glow: '#fff6c2',
  },
  gatePost: { front: '#4b3a99', side: '#33276e', top: '#7a66d6' },
  tram: {
    front: '#2ee6c5',
    side: '#18a58d',
    top: '#8ff7e5',
    glass: '#1b1f4a',
    glassShine: '#4b5cc9',
    light: '#fffbd0',
    stripe: '#ff4fd8',
    hover: '#5ef2ff',
  },
};

// The chaser drone: dark hull so it reads as a threat on both worlds, red eye and beam.
export const CHASER_COLORS = {
  body: '#1a1236',
  trim: '#8a7dff',
  rotor: '#c9d4ff',
  eye: '#ff2e4f',
  siren: '#4fc3ff',
};

export const UI = {
  text: '#ffffff',
  textDim: '#c9b8ff',
  accent: '#5ef2ff',
  accentHot: '#ff4fd8',
  gold: '#ffd84a',
  panel: 'rgba(22, 10, 52, 0.92)',
  panelBorder: '#7b5cff',
  shadow: '#0a0420',
  danger: '#ff4f6d',
};
