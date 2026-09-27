// Neon City theme. Other environments (beach, amusement park, snow, space) will supply
// their own EnvironmentPalette with the same keys.

export type EnvironmentPalette = {
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
  gateBeam: { fill: '#ff3d7f', edge: '#ffd1e3', glow: '#ff3d7f' },
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
