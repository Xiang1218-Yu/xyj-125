export type ParticleType = 'explosion' | 'fire' | 'smoke' | 'magic' | 'sparkle' | 'rain';

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  colorIndex: number;
  gravity: number;
  friction: number;
}

export interface ParticleConfig {
  type: ParticleType;
  width: number;
  height: number;
  frameCount: number;
  particleCount: number;
  colors: number[];
  emitX: number;
  emitY: number;
  emitRadius: number;
  minSpeed: number;
  maxSpeed: number;
  minLife: number;
  maxLife: number;
  minSize: number;
  maxSize: number;
  gravity: number;
  friction: number;
  direction: number;
  spread: number;
  emissionRate: number;
}

export interface ParticleFrame {
  pixels: number[][];
}

export const DEFAULT_PARTICLE_CONFIGS: Record<ParticleType, Omit<ParticleConfig, 'width' | 'height' | 'frameCount'>> = {
  explosion: {
    type: 'explosion',
    particleCount: 40,
    colors: [2, 5, 1, 9],
    emitX: 0.5,
    emitY: 0.5,
    emitRadius: 0.1,
    minSpeed: 1.5,
    maxSpeed: 4,
    minLife: 8,
    maxLife: 20,
    minSize: 1,
    maxSize: 3,
    gravity: 0.1,
    friction: 0.95,
    direction: 0,
    spread: Math.PI * 2,
    emissionRate: 1,
  },
  fire: {
    type: 'fire',
    particleCount: 30,
    colors: [2, 5, 9, 1],
    emitX: 0.5,
    emitY: 0.9,
    emitRadius: 0.2,
    minSpeed: 0.8,
    maxSpeed: 2,
    minLife: 10,
    maxLife: 25,
    minSize: 1,
    maxSize: 2,
    gravity: -0.08,
    friction: 0.97,
    direction: -Math.PI / 2,
    spread: Math.PI * 0.6,
    emissionRate: 3,
  },
  smoke: {
    type: 'smoke',
    particleCount: 25,
    colors: [12, 13, 1, 12],
    emitX: 0.5,
    emitY: 0.8,
    emitRadius: 0.15,
    minSpeed: 0.3,
    maxSpeed: 0.8,
    minLife: 20,
    maxLife: 40,
    minSize: 2,
    maxSize: 4,
    gravity: -0.03,
    friction: 0.99,
    direction: -Math.PI / 2,
    spread: Math.PI * 0.4,
    emissionRate: 2,
  },
  magic: {
    type: 'magic',
    particleCount: 35,
    colors: [8, 7, 10, 1],
    emitX: 0.5,
    emitY: 0.5,
    emitRadius: 0.05,
    minSpeed: 0.5,
    maxSpeed: 1.5,
    minLife: 15,
    maxLife: 30,
    minSize: 1,
    maxSize: 2,
    gravity: 0,
    friction: 0.98,
    direction: 0,
    spread: Math.PI * 2,
    emissionRate: 2,
  },
  sparkle: {
    type: 'sparkle',
    particleCount: 50,
    colors: [1, 5, 14, 10],
    emitX: 0.5,
    emitY: 0.5,
    emitRadius: 0.3,
    minSpeed: 0.2,
    maxSpeed: 1,
    minLife: 5,
    maxLife: 15,
    minSize: 1,
    maxSize: 1,
    gravity: 0,
    friction: 0.96,
    direction: 0,
    spread: Math.PI * 2,
    emissionRate: 4,
  },
  rain: {
    type: 'rain',
    particleCount: 40,
    colors: [7, 10, 12],
    emitX: 0.5,
    emitY: 0,
    emitRadius: 0.5,
    minSpeed: 2,
    maxSpeed: 4,
    minLife: 10,
    maxLife: 20,
    minSize: 1,
    maxSize: 1,
    gravity: 0.2,
    friction: 1,
    direction: Math.PI / 2,
    spread: 0.2,
    emissionRate: 4,
  },
};
