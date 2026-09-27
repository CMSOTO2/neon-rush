// Characters are purely cosmetic: they change colours and silhouette details, never stats.
// New characters (and later outfits) only need a new entry here.

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

export type CharacterDef = {
  id: string;
  name: string;
  tagline: string;
  // Hood ear style: 0 = none, 1 = fox ears.
  ears: 0 | 1;
  colors: CharacterColors;
};

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'nova',
    name: 'Nova',
    tagline: 'Courier of the neon skyline',
    ears: 1,
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
];

export const DEFAULT_CHARACTER_ID = 'nova';

export function getCharacter(id: string): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
