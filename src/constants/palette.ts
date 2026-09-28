// Environments. Each supplies a palette with the same keys plus a scenery style; the
// renderer reads only these, so a new world (amusement park, snow, space...) is a new
// entry in ENVIRONMENTS plus, if it needs one, a scenery drawer.

export type Scenery = 'city' | 'beach';

export type EnvironmentPalette = {
  scenery: Scenery;
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

export const SUNSET_BEACH: EnvironmentPalette = {
  scenery: 'beach',
  // Pink or red would vanish against the sunset sky and sand, so the beach laser is ice.
  gateBeam: { fill: '#b5fbff', edge: '#ffffff', glow: '#b5fbff', arrow: '#3b1d6e' },
  // Sea at the horizon fading into warm sand.
  groundHorizon: '#2a7fd6',
  groundBottom: '#b8834e',
  skyTop: '#2b1055',
  skyMid: '#d6457a',
  skyHorizon: '#ff9e5e',
  horizonGlow: '#ffd27a',
  sunTop: '#fff2a8',
  sunBottom: '#ff6a3d',
  stars: '#fff4d6',
  skyline: '#5a2a6e',
  ground: '#e8b97a',
  groundGrid: '#fff4d6',
  road: '#8a5a3c',
  roadFar: '#a8704a',
  roadSeam: '#5e3a24',
  laneDash: '#fff4d6',
  roadEdge: '#2ee6c5',
  roadEdgeGlow: '#2ee6c5',
  // Beach huts and their lights.
  buildings: ['#2ee6c5', '#ff6a8a', '#ffd84a', '#7b5cff'],
  windows: ['#ffd84a', '#ff9e5e', '#fff4d6'],
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
