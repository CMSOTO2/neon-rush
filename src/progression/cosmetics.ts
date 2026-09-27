// Cosmetic catalog. Cosmetics only change how the runner looks; none affect gameplay.
// Every item can be earned by playing: with coins, by reaching a player level, or by
// unlocking an achievement. (A later "purchase" unlock is sketched in MONETIZATION.md.)

export type CosmeticSlot = 'character' | 'outfit' | 'accessory' | 'trail' | 'board';

export type Unlock =
  | { type: 'default' }
  | { type: 'coins'; cost: number }
  | { type: 'level'; level: number }
  | { type: 'achievement'; id: string };

export type CosmeticItem = {
  id: string;
  slot: CosmeticSlot;
  name: string;
  unlock: Unlock;
  // Outfits belong to one character.
  characterId?: string;
  // Swatch for menus (and the item's main colour where relevant).
  color: string;
};

export const COSMETICS: CosmeticItem[] = [
  // Characters (visual definitions live in game/characters/characters.ts).
  { id: 'nova', slot: 'character', name: 'Nova', unlock: { type: 'default' }, color: '#ff7a1a' },
  {
    id: 'blitz',
    slot: 'character',
    name: 'Blitz',
    unlock: { type: 'coins', cost: 2500 },
    color: '#2ee6c5',
  },
  {
    id: 'juno',
    slot: 'character',
    name: 'Juno',
    unlock: { type: 'level', level: 5 },
    color: '#b36bff',
  },
  {
    id: 'rex',
    slot: 'character',
    name: 'Rex',
    unlock: { type: 'achievement', id: 'run-2500' },
    color: '#8be63c',
  },

  // Outfits: an alternate colourway for one character. "default" means the base look.
  {
    id: 'nova-default',
    slot: 'outfit',
    characterId: 'nova',
    name: 'Classic',
    unlock: { type: 'default' },
    color: '#ff7a1a',
  },
  {
    id: 'nova-midnight',
    slot: 'outfit',
    characterId: 'nova',
    name: 'Midnight',
    unlock: { type: 'coins', cost: 1200 },
    color: '#2a2250',
  },
  {
    id: 'blitz-default',
    slot: 'outfit',
    characterId: 'blitz',
    name: 'Classic',
    unlock: { type: 'default' },
    color: '#2ee6c5',
  },
  {
    id: 'blitz-solar',
    slot: 'outfit',
    characterId: 'blitz',
    name: 'Solar',
    unlock: { type: 'coins', cost: 1500 },
    color: '#ffb000',
  },
  {
    id: 'juno-default',
    slot: 'outfit',
    characterId: 'juno',
    name: 'Classic',
    unlock: { type: 'default' },
    color: '#b36bff',
  },
  {
    id: 'juno-bubblegum',
    slot: 'outfit',
    characterId: 'juno',
    name: 'Bubblegum',
    unlock: { type: 'coins', cost: 1500 },
    color: '#ff8ad8',
  },
  {
    id: 'rex-default',
    slot: 'outfit',
    characterId: 'rex',
    name: 'Classic',
    unlock: { type: 'default' },
    color: '#8be63c',
  },
  {
    id: 'rex-lava',
    slot: 'outfit',
    characterId: 'rex',
    name: 'Lava',
    unlock: { type: 'coins', cost: 2000 },
    color: '#ff4f2e',
  },

  // Accessories, worn on the head.
  { id: 'none', slot: 'accessory', name: 'None', unlock: { type: 'default' }, color: '#3a2a70' },
  {
    id: 'headphones',
    slot: 'accessory',
    name: 'Headphones',
    unlock: { type: 'coins', cost: 800 },
    color: '#5ef2ff',
  },
  {
    id: 'cap',
    slot: 'accessory',
    name: 'Snapback',
    unlock: { type: 'level', level: 3 },
    color: '#ff4f6d',
  },
  {
    id: 'crown',
    slot: 'accessory',
    name: 'Crown',
    unlock: { type: 'achievement', id: 'run-5000' },
    color: '#ffd84a',
  },

  // Trails behind the runner's feet.
  { id: 'trail-none', slot: 'trail', name: 'None', unlock: { type: 'default' }, color: '#3a2a70' },
  {
    id: 'trail-cyan',
    slot: 'trail',
    name: 'Neon Stream',
    unlock: { type: 'coins', cost: 600 },
    color: '#5ef2ff',
  },
  {
    id: 'trail-fire',
    slot: 'trail',
    name: 'Afterburn',
    unlock: { type: 'coins', cost: 1800 },
    color: '#ff7a1a',
  },
  {
    id: 'trail-rainbow',
    slot: 'trail',
    name: 'Prism',
    unlock: { type: 'achievement', id: 'missions-10' },
    color: '#ff6ad5',
  },

  // Hoverboards, ridden while the speed boost is active.
  {
    id: 'board-neon',
    slot: 'board',
    name: 'Neon Deck',
    unlock: { type: 'default' },
    color: '#ff4fd8',
  },
  {
    id: 'board-circuit',
    slot: 'board',
    name: 'Circuit',
    unlock: { type: 'coins', cost: 1000 },
    color: '#5ef2ff',
  },
  {
    id: 'board-magma',
    slot: 'board',
    name: 'Magma',
    unlock: { type: 'level', level: 8 },
    color: '#ff4f2e',
  },
  {
    id: 'board-gold',
    slot: 'board',
    name: 'Gold Rush',
    unlock: { type: 'achievement', id: 'coins-5000' },
    color: '#ffd84a',
  },
];

export const DEFAULT_LOADOUT = {
  character: 'nova',
  outfit: 'nova-default',
  accessory: 'none',
  trail: 'trail-none',
  board: 'board-neon',
};

export type Loadout = typeof DEFAULT_LOADOUT;

export const DEFAULT_UNLOCKED = COSMETICS.filter((c) => c.unlock.type === 'default').map(
  (c) => c.id,
);

export function cosmetic(id: string): CosmeticItem | undefined {
  return COSMETICS.find((c) => c.id === id);
}

export function itemsFor(slot: CosmeticSlot, characterId?: string): CosmeticItem[] {
  return COSMETICS.filter(
    (c) => c.slot === slot && (slot !== 'outfit' || c.characterId === characterId),
  );
}

export function unlockLabel(unlock: Unlock, achievementName?: string): string {
  switch (unlock.type) {
    case 'default':
      return 'Owned';
    case 'coins':
      return `${unlock.cost.toLocaleString()} coins`;
    case 'level':
      return `Reach level ${unlock.level}`;
    case 'achievement':
      return achievementName ? `Achievement: ${achievementName}` : 'Achievement';
  }
}

// Items that unlock automatically (level or achievement) once their condition is met.
export function autoUnlocks(level: number, achievements: string[], owned: string[]): string[] {
  return COSMETICS.filter((c) => {
    if (owned.includes(c.id)) return false;
    if (c.unlock.type === 'level') return level >= c.unlock.level;
    if (c.unlock.type === 'achievement') return achievements.includes(c.unlock.id);
    return false;
  }).map((c) => c.id);
}
