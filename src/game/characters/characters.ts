// Characters are purely cosmetic: they change colours and silhouette details, never stats.
// A new character needs an entry here plus one in progression/cosmetics.ts.

export type CharacterColors = {
  jacket: string;
  jacketShade: string;
  trim: string;
  pants: string;
  shoes: string;
  soleGlow: string;
  skin: string;
  visor: string;
  backpack: string;
  backpackLight: string;
  hair: string;
};

// Hood silhouette, drawn from behind.
export const HeadStyle = {
  Plain: 0,
  FoxEars: 1,
  Antenna: 2,
  PomBeanie: 3,
  DinoSpikes: 4,
} as const;

export type CharacterDef = {
  id: string;
  name: string;
  tagline: string;
  head: number;
  colors: CharacterColors;
};

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'nova',
    name: 'Nova',
    tagline: 'Courier of the neon skyline',
    head: HeadStyle.FoxEars,
    colors: {
      jacket: '#ff7a1a',
      jacketShade: '#d95a0a',
      trim: '#ffd23f',
      pants: '#2b2d6e',
      shoes: '#ffffff',
      soleGlow: '#5ef2ff',
      skin: '#f1b38a',
      visor: '#5ef2ff',
      backpack: '#7b5cff',
      backpackLight: '#5ef2ff',
      hair: '#ff7a1a',
    },
  },
  {
    id: 'blitz',
    name: 'Blitz',
    tagline: 'Tinkerer with a signal to chase',
    head: HeadStyle.Antenna,
    colors: {
      jacket: '#2ee6c5',
      jacketShade: '#16a88f',
      trim: '#ffffff',
      pants: '#1e2250',
      shoes: '#ff4fd8',
      soleGlow: '#ffd84a',
      skin: '#8d5a3b',
      visor: '#ffd84a',
      backpack: '#ff4fd8',
      backpackLight: '#ffd84a',
      hair: '#1e2250',
    },
  },
  {
    id: 'juno',
    name: 'Juno',
    tagline: 'Rooftop freerunner, never stops',
    head: HeadStyle.PomBeanie,
    colors: {
      jacket: '#b36bff',
      jacketShade: '#8144d4',
      trim: '#ff8ad8',
      pants: '#2a1850',
      shoes: '#5ef2ff',
      soleGlow: '#ff8ad8',
      skin: '#f6c9a0',
      visor: '#ff8ad8',
      backpack: '#ffd84a',
      backpackLight: '#ff4fd8',
      hair: '#ff8ad8',
    },
  },
  {
    id: 'rex',
    name: 'Rex',
    tagline: 'Loud hoodie, louder sneakers',
    head: HeadStyle.DinoSpikes,
    colors: {
      jacket: '#8be63c',
      jacketShade: '#5fb31e',
      trim: '#ffd84a',
      pants: '#233a1a',
      shoes: '#ff7a1a',
      soleGlow: '#8be63c',
      skin: '#c98c5f',
      visor: '#ff7a1a',
      backpack: '#ff7a1a',
      backpackLight: '#ffd84a',
      hair: '#8be63c',
    },
  },
];

// Outfits recolour a character; only the listed colours change.
export const OUTFITS: Record<string, Partial<CharacterColors>> = {
  'nova-midnight': {
    jacket: '#2a2250',
    jacketShade: '#1b1538',
    trim: '#ff4fd8',
    pants: '#0f0b24',
    backpack: '#ff4fd8',
  },
  'blitz-solar': {
    jacket: '#ffb000',
    jacketShade: '#d98a00',
    trim: '#ff4f2e',
    backpack: '#2ee6c5',
  },
  'juno-bubblegum': {
    jacket: '#ff8ad8',
    jacketShade: '#e062b8',
    trim: '#5ef2ff',
    backpack: '#b36bff',
  },
  'rex-lava': { jacket: '#ff4f2e', jacketShade: '#c93414', trim: '#ffd84a', pants: '#3a1408' },
};

export const DEFAULT_CHARACTER_ID = 'nova';

export function getCharacter(id: string): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}

export function characterLook(
  id: string,
  outfitId: string,
): { head: number; colors: CharacterColors } {
  const def = getCharacter(id);
  return { head: def.head, colors: { ...def.colors, ...(OUTFITS[outfitId] ?? {}) } };
}
