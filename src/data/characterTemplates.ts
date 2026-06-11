import type { Character, Frame, Layer, Action } from '@/types/animation';

const generateId = () => Math.random().toString(36).substring(2, 11);

const createEmptyPixels = (width: number, height: number): number[][] => {
  return Array(height).fill(null).map(() => Array(width).fill(-1));
};

const createFrameFromPixels = (
  width: number,
  height: number,
  pixels: number[][],
  name: string,
  delay: number
): Frame => {
  const layer: Layer = {
    id: generateId(),
    name: 'Layer 1',
    pixels: pixels.map((row) => [...row]),
    visible: true,
    locked: false,
    opacity: 1,
  };
  return {
    id: generateId(),
    name,
    layers: [layer],
    delay,
  };
};

export interface CharacterTemplate {
  id: string;
  name: string;
  category: 'warrior' | 'mage' | 'npc' | 'monster';
  description: string;
  width: number;
  height: number;
  previewPixels: number[][];
  buildCharacter: () => Character;
}

const buildWarriorPixels = (): { idle: number[][]; walk1: number[][]; walk2: number[][]; attack: number[][] } => {
  const width = 16;
  const height = 16;
  const skin = 1;
  const outline = 0;
  const armor = 2;
  const armorDark = 3;
  const sword = 4;
  const swordHilt = 5;
  const helmet = 6;

  const idle = createEmptyPixels(width, height);
  for (let y = 2; y < 6; y++) {
    for (let x = 5; x < 11; x++) idle[y][x] = skin;
  }
  for (let y = 1; y < 7; y++) { idle[y][4] = outline; idle[y][11] = outline; }
  for (let x = 4; x < 12; x++) { idle[1][x] = outline; idle[6][x] = outline; }
  for (let x = 5; x < 11; x++) { idle[1][x] = helmet; idle[2][x] = helmet; }
  idle[4][6] = outline; idle[4][9] = outline;
  idle[3][6] = skin; idle[3][9] = skin;

  for (let y = 6; y < 12; y++) {
    for (let x = 5; x < 11; x++) idle[y][x] = armor;
  }
  for (let y = 6; y < 12; y++) { idle[y][4] = outline; idle[y][11] = outline; }
  for (let x = 5; x < 11; x++) idle[8][x] = armorDark;
  idle[7][7] = outline; idle[7][8] = outline;

  idle[12][4] = outline; idle[12][11] = outline;
  idle[12][5] = outline; idle[12][10] = outline;
  for (let y = 12; y < 15; y++) {
    idle[y][6] = outline; idle[y][7] = armorDark;
    idle[y][8] = armorDark; idle[y][9] = outline;
  }
  idle[15][6] = outline; idle[15][7] = outline;
  idle[15][8] = outline; idle[15][9] = outline;

  idle[7][3] = outline; idle[8][3] = armor; idle[9][3] = armor; idle[10][3] = outline;
  idle[7][12] = outline; idle[8][12] = armor; idle[9][12] = armor; idle[10][12] = outline;
  idle[6][13] = sword; idle[7][13] = sword; idle[8][13] = sword;
  idle[5][13] = swordHilt; idle[9][13] = swordHilt;
  idle[4][13] = outline;

  const walk1 = idle.map(r => [...r]);
  for (let y = 12; y < 15; y++) { walk1[y][6] = -1; walk1[y][7] = -1; }
  walk1[13][5] = outline; walk1[14][5] = outline;
  walk1[13][6] = armorDark; walk1[14][6] = armorDark;

  const walk2 = idle.map(r => [...r]);
  for (let y = 12; y < 15; y++) { walk2[y][8] = -1; walk2[y][9] = -1; }
  walk2[13][9] = outline; walk2[14][9] = outline;
  walk2[13][10] = outline; walk2[14][10] = outline;
  walk2[13][8] = armorDark; walk2[14][8] = armorDark;

  const attack = idle.map(r => [...r]);
  for (let y = 2; y < 11; y++) { attack[y][13] = -1; attack[y][14] = -1; }
  for (let x = 12; x < 16; x++) attack[4][x] = sword;
  attack[4][11] = swordHilt; attack[3][12] = outline;
  attack[5][12] = outline; attack[3][13] = outline;
  attack[5][13] = outline;

  return { idle, walk1, walk2, attack };
};

const buildMagePixels = (): { idle: number[][]; walk1: number[][]; walk2: number[][]; cast: number[][] } => {
  const width = 16;
  const height = 16;
  const skin = 1;
  const outline = 0;
  const robe = 7;
  const robeDark = 8;
  const hat = 9;
  const hatStar = 10;
  const staff = 11;
  const orb = 12;

  const idle = createEmptyPixels(width, height);
  for (let y = 3; y < 6; y++) {
    for (let x = 5; x < 11; x++) idle[y][x] = skin;
  }
  for (let y = 2; y < 7; y++) { idle[y][4] = outline; idle[y][11] = outline; }
  for (let x = 4; x < 12; x++) { idle[2][x] = outline; idle[6][x] = outline; }
  idle[4][6] = outline; idle[4][9] = outline;
  idle[3][6] = skin; idle[3][9] = skin;

  for (let x = 3; x < 13; x++) idle[1][x] = hat;
  for (let x = 4; x < 12; x++) idle[0][x] = hat;
  for (let x = 6; x < 10; x++) idle[0][x] = outline;
  idle[1][7] = hatStar; idle[1][8] = hatStar;

  for (let y = 6; y < 13; y++) {
    for (let x = 4; x < 12; x++) idle[y][x] = robe;
  }
  for (let y = 6; y < 13; y++) { idle[y][3] = outline; idle[y][12] = outline; }
  for (let x = 4; x < 12; x++) idle[13][x] = outline;
  for (let x = 5; x < 11; x++) idle[9][x] = robeDark;
  idle[8][6] = outline; idle[8][7] = outline;
  idle[8][8] = outline; idle[8][9] = outline;

  for (let y = 13; y < 16; y++) {
    for (let x = 5; x < 8; x++) idle[y][x] = robeDark;
    for (let x = 8; x < 11; x++) idle[y][x] = robeDark;
  }
  idle[14][5] = outline; idle[14][7] = outline;
  idle[14][8] = outline; idle[14][10] = outline;
  idle[15][5] = outline; idle[15][6] = outline;
  idle[15][7] = outline; idle[15][8] = outline;
  idle[15][9] = outline; idle[15][10] = outline;

  idle[7][2] = outline; idle[8][2] = robe; idle[9][2] = robe; idle[10][2] = outline;
  idle[7][13] = outline; idle[8][13] = robe; idle[9][13] = robe; idle[10][13] = outline;
  for (let y = 3; y < 12; y++) idle[y][14] = staff;
  idle[2][14] = orb; idle[2][13] = orb; idle[2][15] = orb;
  idle[1][14] = orb; idle[3][14] = outline;

  const walk1 = idle.map(r => [...r]);
  for (let y = 13; y < 16; y++) { for (let x = 5; x < 8; x++) walk1[y][x] = -1; }
  walk1[14][4] = outline; walk1[15][4] = outline;
  walk1[14][5] = robeDark; walk1[15][5] = robeDark;
  walk1[14][6] = robeDark; walk1[15][6] = robeDark;

  const walk2 = idle.map(r => [...r]);
  for (let y = 13; y < 16; y++) { for (let x = 8; x < 11; x++) walk2[y][x] = -1; }
  walk2[14][10] = outline; walk2[15][10] = outline;
  walk2[14][11] = outline; walk2[15][11] = outline;
  walk2[14][9] = robeDark; walk2[15][9] = robeDark;

  const cast = idle.map(r => [...r]);
  for (let y = 0; y < 3; y++) { for (let x = 13; x < 16; x++) cast[y][x] = orb; }
  cast[0][12] = orb; cast[1][12] = orb; cast[2][12] = outline;
  cast[3][13] = outline; cast[3][14] = outline; cast[3][15] = outline;
  for (let y = 5; y < 9; y++) { for (let x = 0; x < 4; x++) cast[y][x] = orb; }

  return { idle, walk1, walk2, cast };
};

const buildNpcPixels = (): { idle: number[][]; walk1: number[][]; walk2: number[][]; talk: number[][] } => {
  const width = 16;
  const height = 16;
  const skin = 1;
  const outline = 0;
  const shirt = 13;
  const shirtDark = 14;
  const hair = 15;
  const pants = 3;
  const bubble = 1;

  const idle = createEmptyPixels(width, height);
  for (let y = 3; y < 6; y++) {
    for (let x = 5; x < 11; x++) idle[y][x] = skin;
  }
  for (let y = 2; y < 7; y++) { idle[y][4] = outline; idle[y][11] = outline; }
  for (let x = 4; x < 12; x++) { idle[2][x] = outline; idle[6][x] = outline; }
  for (let x = 4; x < 12; x++) idle[2][x] = hair;
  idle[2][4] = outline; idle[2][11] = outline;
  for (let y = 1; y < 3; y++) { for (let x = 5; x < 11; x++) idle[y][x] = hair; }
  idle[1][4] = outline; idle[1][11] = outline;
  idle[4][6] = outline; idle[4][9] = outline;
  idle[4][7] = outline; idle[4][8] = outline;
  idle[5][7] = outline; idle[5][8] = outline;

  for (let y = 6; y < 11; y++) {
    for (let x = 5; x < 11; x++) idle[y][x] = shirt;
  }
  for (let y = 6; y < 11; y++) { idle[y][4] = outline; idle[y][11] = outline; }
  for (let x = 5; x < 11; x++) idle[8][x] = shirtDark;

  idle[7][3] = outline; idle[8][3] = shirt; idle[9][3] = shirt; idle[10][3] = outline;
  idle[7][12] = outline; idle[8][12] = shirt; idle[9][12] = shirt; idle[10][12] = outline;

  idle[11][4] = outline; idle[11][11] = outline;
  idle[11][5] = outline; idle[11][10] = outline;
  for (let y = 11; y < 15; y++) {
    idle[y][6] = outline; idle[y][7] = pants;
    idle[y][8] = pants; idle[y][9] = outline;
  }
  idle[15][6] = outline; idle[15][7] = outline;
  idle[15][8] = outline; idle[15][9] = outline;

  const walk1 = idle.map(r => [...r]);
  for (let y = 11; y < 15; y++) { walk1[y][6] = -1; walk1[y][7] = -1; }
  walk1[12][5] = outline; walk1[13][5] = outline;
  walk1[12][6] = pants; walk1[13][6] = pants;

  const walk2 = idle.map(r => [...r]);
  for (let y = 11; y < 15; y++) { walk2[y][8] = -1; walk2[y][9] = -1; }
  walk2[12][9] = outline; walk2[13][9] = outline;
  walk2[12][10] = outline; walk2[13][10] = outline;
  walk2[12][8] = pants; walk2[13][8] = pants;

  const talk = idle.map(r => [...r]);
  talk[0][11] = outline; talk[0][12] = bubble; talk[0][13] = bubble; talk[0][14] = outline;
  talk[1][10] = outline; talk[1][11] = bubble; talk[1][12] = bubble; talk[1][13] = bubble; talk[1][14] = bubble; talk[1][15] = outline;
  talk[2][10] = bubble; talk[2][11] = outline; talk[2][12] = bubble; talk[2][13] = outline; talk[2][14] = bubble; talk[2][15] = outline;
  talk[3][10] = outline; talk[3][11] = bubble; talk[3][12] = bubble; talk[3][13] = bubble; talk[3][14] = bubble; talk[3][15] = outline;
  talk[4][11] = outline; talk[4][12] = bubble; talk[4][13] = bubble; talk[4][14] = outline;
  talk[5][12] = outline; talk[5][13] = bubble; talk[5][14] = outline;

  return { idle, walk1, walk2, talk };
};

const buildMonsterPixels = (): { idle: number[][]; walk1: number[][]; walk2: number[][]; attack: number[][] } => {
  const width = 16;
  const height = 16;
  const body = 2;
  const bodyDark = 14;
  const outline = 0;
  const eye = 1;
  const eyePupil = 0;
  const tooth = 1;
  const claw = 4;

  const idle = createEmptyPixels(width, height);
  for (let y = 2; y < 14; y++) {
    for (let x = 3; x < 13; x++) idle[y][x] = body;
  }
  for (let y = 2; y < 14; y++) { idle[y][2] = outline; idle[y][13] = outline; }
  for (let x = 3; x < 13; x++) { idle[1][x] = outline; idle[14][x] = outline; }
  idle[2][3] = outline; idle[2][12] = outline;
  idle[13][3] = outline; idle[13][12] = outline;

  for (let y = 4; y < 7; y++) {
    for (let x = 5; x < 7; x++) idle[y][x] = eye;
    for (let x = 9; x < 11; x++) idle[y][x] = eye;
  }
  idle[5][5] = eyePupil; idle[5][10] = eyePupil;
  idle[4][5] = outline; idle[4][6] = outline; idle[4][9] = outline; idle[4][10] = outline;
  idle[6][5] = outline; idle[6][6] = outline; idle[6][9] = outline; idle[6][10] = outline;
  idle[5][4] = outline; idle[5][7] = outline; idle[5][8] = outline; idle[5][11] = outline;

  for (let x = 5; x < 11; x++) { idle[9][x] = outline; idle[10][x] = outline; }
  for (let x = 6; x < 10; x++) idle[9][x] = tooth;
  idle[9][6] = outline; idle[9][8] = outline;

  for (let x = 3; x < 13; x++) idle[7][x] = bodyDark;
  for (let x = 3; x < 13; x++) idle[12][x] = bodyDark;

  idle[14][3] = claw; idle[14][5] = claw; idle[14][7] = claw; idle[14][9] = claw; idle[14][11] = claw;
  idle[15][3] = outline; idle[15][5] = outline; idle[15][7] = outline; idle[15][9] = outline; idle[15][11] = outline;

  idle[5][1] = claw; idle[6][0] = claw; idle[7][0] = claw; idle[8][0] = claw;
  idle[5][1] = outline; idle[6][1] = body; idle[7][1] = body; idle[8][1] = outline;

  idle[5][14] = claw; idle[6][15] = claw; idle[7][15] = claw; idle[8][15] = claw;
  idle[5][14] = outline; idle[6][14] = body; idle[7][14] = body; idle[8][14] = outline;

  const walk1 = idle.map(r => [...r]);
  for (let x = 3; x < 9; x++) { walk1[14][x] = -1; walk1[15][x] = -1; }
  walk1[15][2] = outline; walk1[15][3] = claw;
  walk1[15][4] = outline; walk1[15][5] = claw;
  walk1[14][2] = outline; walk1[14][3] = bodyDark;
  walk1[14][4] = bodyDark; walk1[14][5] = outline;

  const walk2 = idle.map(r => [...r]);
  for (let x = 7; x < 13; x++) { walk2[14][x] = -1; walk2[15][x] = -1; }
  walk2[15][10] = outline; walk2[15][11] = claw;
  walk2[15][12] = outline; walk2[15][13] = claw;
  walk2[14][10] = outline; walk2[14][11] = bodyDark;
  walk2[14][12] = bodyDark; walk2[14][13] = outline;

  const attack = idle.map(r => [...r]);
  for (let y = 3; y < 9; y++) { attack[y][0] = claw; attack[y][1] = claw; }
  for (let y = 3; y < 9; y++) { attack[y][0] = outline; }
  attack[2][0] = outline; attack[2][1] = outline; attack[2][2] = outline;
  attack[9][0] = outline; attack[9][1] = outline; attack[9][2] = outline;

  return { idle, walk1, walk2, attack };
};

const buildKnightPixels = (): { idle: number[][]; walk1: number[][]; walk2: number[][]; attack: number[][] } => {
  const width = 16;
  const height = 16;
  const skin = 1;
  const outline = 0;
  const plate = 6;
  const plateDark = 3;
  const gold = 15;
  const shield = 7;
  const sword = 4;

  const idle = createEmptyPixels(width, height);
  for (let y = 2; y < 6; y++) for (let x = 5; x < 11; x++) idle[y][x] = skin;
  for (let y = 1; y < 7; y++) { idle[y][4] = outline; idle[y][11] = outline; }
  for (let x = 4; x < 12; x++) { idle[1][x] = outline; idle[6][x] = outline; }
  for (let x = 5; x < 11; x++) { idle[1][x] = plate; idle[2][x] = plate; }
  idle[1][7] = gold; idle[1][8] = gold; idle[0][7] = gold; idle[0][8] = gold;
  idle[3][6] = outline; idle[3][9] = outline; idle[4][6] = outline; idle[4][9] = outline;
  for (let y = 6; y < 12; y++) for (let x = 5; x < 11; x++) idle[y][x] = plate;
  for (let y = 6; y < 12; y++) { idle[y][4] = outline; idle[y][11] = outline; }
  idle[8][5] = gold; idle[8][6] = gold; idle[8][9] = gold; idle[8][10] = gold;
  for (let y = 7; y < 10; y++) { idle[y][7] = gold; idle[y][8] = gold; }
  idle[12][4] = outline; idle[12][11] = outline; idle[12][5] = outline; idle[12][10] = outline;
  for (let y = 12; y < 15; y++) { idle[y][6] = outline; idle[y][7] = plateDark; idle[y][8] = plateDark; idle[y][9] = outline; }
  idle[15][6] = outline; idle[15][7] = outline; idle[15][8] = outline; idle[15][9] = outline;
  idle[7][3] = outline; idle[8][3] = shield; idle[9][3] = shield; idle[10][3] = outline;
  idle[7][2] = outline; idle[8][2] = shield; idle[9][2] = shield; idle[10][2] = outline;
  idle[8][3] = gold; idle[9][3] = outline;
  idle[7][12] = outline; idle[8][12] = plate; idle[9][12] = plate; idle[10][12] = outline;
  for (let y = 2; y < 9; y++) idle[y][13] = sword;
  idle[9][13] = outline; idle[1][13] = outline; idle[10][13] = outline;

  const walk1 = idle.map(r => [...r]);
  for (let y = 12; y < 15; y++) { walk1[y][6] = -1; walk1[y][7] = -1; }
  walk1[13][5] = outline; walk1[14][5] = outline;
  walk1[13][6] = plateDark; walk1[14][6] = plateDark;

  const walk2 = idle.map(r => [...r]);
  for (let y = 12; y < 15; y++) { walk2[y][8] = -1; walk2[y][9] = -1; }
  walk2[13][9] = outline; walk2[14][9] = outline;
  walk2[13][10] = outline; walk2[14][10] = outline;
  walk2[13][8] = plateDark; walk2[14][8] = plateDark;

  const attack = idle.map(r => [...r]);
  for (let y = 2; y < 11; y++) { attack[y][13] = -1; }
  for (let x = 11; x < 16; x++) attack[5][x] = sword;
  attack[4][11] = outline; attack[6][11] = outline;

  return { idle, walk1, walk2, attack };
};

const buildArcherPixels = (): { idle: number[][]; walk1: number[][]; walk2: number[][]; shoot: number[][] } => {
  const width = 16;
  const height = 16;
  const skin = 1;
  const outline = 0;
  const leather = 14;
  const leatherDark = 3;
  const green = 15;
  const bow = 11;
  const arrow = 4;

  const idle = createEmptyPixels(width, height);
  for (let y = 3; y < 6; y++) for (let x = 5; x < 11; x++) idle[y][x] = skin;
  for (let y = 2; y < 7; y++) { idle[y][4] = outline; idle[y][11] = outline; }
  for (let x = 4; x < 12; x++) { idle[2][x] = outline; idle[6][x] = outline; }
  for (let x = 4; x < 12; x++) idle[2][x] = green;
  idle[2][4] = outline; idle[2][11] = outline;
  for (let y = 1; y < 3; y++) for (let x = 5; x < 11; x++) idle[y][x] = green;
  idle[4][6] = outline; idle[4][9] = outline;
  for (let y = 6; y < 11; y++) for (let x = 5; x < 11; x++) idle[y][x] = leather;
  for (let y = 6; y < 11; y++) { idle[y][4] = outline; idle[y][11] = outline; }
  for (let x = 5; x < 11; x++) idle[8][x] = leatherDark;
  idle[7][3] = outline; idle[8][3] = leather; idle[9][3] = leather; idle[10][3] = outline;
  idle[7][12] = outline; idle[8][12] = leather; idle[9][12] = leather; idle[10][12] = outline;
  for (let y = 3; y < 12; y++) { idle[y][13] = bow; idle[y][15] = bow; }
  idle[2][14] = bow; idle[12][14] = bow;
  idle[5][13] = arrow; idle[5][14] = arrow;
  idle[12][4] = outline; idle[12][11] = outline;
  idle[12][5] = outline; idle[12][10] = outline;
  for (let y = 12; y < 15; y++) { idle[y][6] = outline; idle[y][7] = leatherDark; idle[y][8] = leatherDark; idle[y][9] = outline; }
  idle[15][6] = outline; idle[15][7] = outline; idle[15][8] = outline; idle[15][9] = outline;

  const walk1 = idle.map(r => [...r]);
  for (let y = 12; y < 15; y++) { walk1[y][6] = -1; walk1[y][7] = -1; }
  walk1[13][5] = outline; walk1[14][5] = outline;
  walk1[13][6] = leatherDark; walk1[14][6] = leatherDark;

  const walk2 = idle.map(r => [...r]);
  for (let y = 12; y < 15; y++) { walk2[y][8] = -1; walk2[y][9] = -1; }
  walk2[13][9] = outline; walk2[14][9] = outline;
  walk2[13][10] = outline; walk2[14][10] = outline;
  walk2[13][8] = leatherDark; walk2[14][8] = leatherDark;

  const shoot = idle.map(r => [...r]);
  for (let y = 3; y < 13; y++) { shoot[y][13] = -1; shoot[y][15] = -1; }
  shoot[2][14] = -1; shoot[12][14] = -1;
  for (let x = 8; x < 16; x++) shoot[7][x] = arrow;
  shoot[6][11] = bow; shoot[8][11] = bow;
  shoot[5][12] = bow; shoot[9][12] = bow;
  shoot[4][13] = bow; shoot[10][13] = bow;

  return { idle, walk1, walk2, shoot };
};

const buildCharacterFromFrames = (
  name: string,
  width: number,
  height: number,
  frames: { action: string; pixels: number[][]; delay: number; loop: boolean }[]
): Character => {
  const actionMap = new Map<string, Action>();

  for (const f of frames) {
    if (!actionMap.has(f.action)) {
      actionMap.set(f.action, {
        id: generateId(),
        name: f.action,
        frames: [],
        loop: f.loop,
      });
    }
    const action = actionMap.get(f.action)!;
    const frameCount = action.frames.length + 1;
    action.frames.push(
      createFrameFromPixels(
        width,
        height,
        f.pixels,
        `${f.action}_${String(frameCount).padStart(3, '0')}`,
        f.delay
      )
    );
  }

  return {
    id: generateId(),
    name,
    width,
    height,
    actions: Array.from(actionMap.values()),
  };
};

const warriorPixels = buildWarriorPixels();
const magePixels = buildMagePixels();
const npcPixels = buildNpcPixels();
const monsterPixels = buildMonsterPixels();
const knightPixels = buildKnightPixels();
const archerPixels = buildArcherPixels();

export const characterTemplates: CharacterTemplate[] = [
  {
    id: 'warrior',
    name: '战士',
    category: 'warrior',
    description: '身穿铠甲，手持利剑的近战角色',
    width: 16,
    height: 16,
    previewPixels: warriorPixels.idle,
    buildCharacter: () => buildCharacterFromFrames('战士', 16, 16, [
      { action: 'idle', pixels: warriorPixels.idle, delay: 200, loop: true },
      { action: 'walk', pixels: warriorPixels.walk1, delay: 150, loop: true },
      { action: 'walk', pixels: warriorPixels.walk2, delay: 150, loop: true },
      { action: 'attack', pixels: warriorPixels.attack, delay: 200, loop: false },
    ]),
  },
  {
    id: 'mage',
    name: '法师',
    category: 'mage',
    description: '佩戴尖帽，手持法杖的魔法角色',
    width: 16,
    height: 16,
    previewPixels: magePixels.idle,
    buildCharacter: () => buildCharacterFromFrames('法师', 16, 16, [
      { action: 'idle', pixels: magePixels.idle, delay: 200, loop: true },
      { action: 'walk', pixels: magePixels.walk1, delay: 150, loop: true },
      { action: 'walk', pixels: magePixels.walk2, delay: 150, loop: true },
      { action: 'cast', pixels: magePixels.cast, delay: 300, loop: false },
    ]),
  },
  {
    id: 'npc',
    name: 'NPC村民',
    category: 'npc',
    description: '普通村民，可进行对话交互',
    width: 16,
    height: 16,
    previewPixels: npcPixels.idle,
    buildCharacter: () => buildCharacterFromFrames('NPC村民', 16, 16, [
      { action: 'idle', pixels: npcPixels.idle, delay: 200, loop: true },
      { action: 'walk', pixels: npcPixels.walk1, delay: 150, loop: true },
      { action: 'walk', pixels: npcPixels.walk2, delay: 150, loop: true },
      { action: 'talk', pixels: npcPixels.talk, delay: 250, loop: true },
    ]),
  },
  {
    id: 'monster',
    name: '史莱姆怪物',
    category: 'monster',
    description: '圆滚滚的怪物，带有利齿和利爪',
    width: 16,
    height: 16,
    previewPixels: monsterPixels.idle,
    buildCharacter: () => buildCharacterFromFrames('史莱姆', 16, 16, [
      { action: 'idle', pixels: monsterPixels.idle, delay: 200, loop: true },
      { action: 'walk', pixels: monsterPixels.walk1, delay: 180, loop: true },
      { action: 'walk', pixels: monsterPixels.walk2, delay: 180, loop: true },
      { action: 'attack', pixels: monsterPixels.attack, delay: 200, loop: false },
    ]),
  },
  {
    id: 'knight',
    name: '圣骑士',
    category: 'warrior',
    description: '全身板甲，手持盾牌的精英战士',
    width: 16,
    height: 16,
    previewPixels: knightPixels.idle,
    buildCharacter: () => buildCharacterFromFrames('圣骑士', 16, 16, [
      { action: 'idle', pixels: knightPixels.idle, delay: 200, loop: true },
      { action: 'walk', pixels: knightPixels.walk1, delay: 150, loop: true },
      { action: 'walk', pixels: knightPixels.walk2, delay: 150, loop: true },
      { action: 'attack', pixels: knightPixels.attack, delay: 200, loop: false },
    ]),
  },
  {
    id: 'archer',
    name: '弓箭手',
    category: 'warrior',
    description: '身着皮甲，手持长弓的远程角色',
    width: 16,
    height: 16,
    previewPixels: archerPixels.idle,
    buildCharacter: () => buildCharacterFromFrames('弓箭手', 16, 16, [
      { action: 'idle', pixels: archerPixels.idle, delay: 200, loop: true },
      { action: 'walk', pixels: archerPixels.walk1, delay: 150, loop: true },
      { action: 'walk', pixels: archerPixels.walk2, delay: 150, loop: true },
      { action: 'shoot', pixels: archerPixels.shoot, delay: 200, loop: false },
    ]),
  },
];

export const templateCategories = [
  { id: 'all', name: '全部', icon: 'grid' },
  { id: 'warrior', name: '战士系', icon: 'sword' },
  { id: 'mage', name: '法师系', icon: 'wand' },
  { id: 'npc', name: 'NPC', icon: 'user' },
  { id: 'monster', name: '怪物', icon: 'skull' },
] as const;
