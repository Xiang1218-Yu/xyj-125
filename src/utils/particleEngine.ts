import type { Particle, ParticleConfig, ParticleFrame } from '@/types/particle';

let particleIdCounter = 0;

const randomRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

const createEmptyPixels = (width: number, height: number): number[][] => {
  return Array(height).fill(null).map(() => Array(width).fill(-1));
};

const createParticle = (config: ParticleConfig): Particle => {
  const angle = config.direction + randomRange(-config.spread / 2, config.spread / 2);
  const speed = randomRange(config.minSpeed, config.maxSpeed);
  const emitRadius = Math.min(config.width, config.height) * config.emitRadius;
  const offsetAngle = Math.random() * Math.PI * 2;
  const offsetDist = Math.random() * emitRadius;

  return {
    id: particleIdCounter++,
    x: config.width * config.emitX + Math.cos(offsetAngle) * offsetDist,
    y: config.height * config.emitY + Math.sin(offsetAngle) * offsetDist,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: randomRange(config.minLife, config.maxLife),
    maxLife: randomRange(config.minLife, config.maxLife),
    size: Math.floor(randomRange(config.minSize, config.maxSize + 1)),
    colorIndex: config.colors[Math.floor(Math.random() * config.colors.length)],
    gravity: config.gravity,
    friction: config.friction,
  };
};

const updateParticle = (particle: Particle): boolean => {
  particle.vy += particle.gravity;
  particle.vx *= particle.friction;
  particle.vy *= particle.friction;
  particle.x += particle.vx;
  particle.y += particle.vy;
  particle.life -= 1;
  return particle.life > 0;
};

const drawParticle = (pixels: number[][], particle: Particle, width: number, height: number) => {
  const lifeRatio = particle.life / particle.maxLife;
  const alphaThreshold = lifeRatio;

  const size = particle.size;
  const px = Math.floor(particle.x);
  const py = Math.floor(particle.y);

  for (let dy = -size + 1; dy < size; dy++) {
    for (let dx = -size + 1; dx < size; dx++) {
      const x = px + dx;
      const y = py + dy;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;

      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= size) continue;

      const distRatio = 1 - dist / size;
      const intensity = distRatio * lifeRatio;

      if (intensity > 0.3 && Math.random() < alphaThreshold) {
        if (pixels[y][x] === -1 || intensity > 0.7) {
          pixels[y][x] = particle.colorIndex;
        }
      }
    }
  }
};

export const generateParticleFrames = (config: ParticleConfig): ParticleFrame[] => {
  const frames: ParticleFrame[] = [];
  const particles: Particle[] = [];
  particleIdCounter = 0;

  const totalParticles = config.particleCount * config.emissionRate * config.frameCount;
  const particlesPerFrame = Math.ceil(config.particleCount * config.emissionRate);
  const maxParticles = config.particleCount * 3;

  for (let frame = 0; frame < config.frameCount; frame++) {
    const pixels = createEmptyPixels(config.width, config.height);

    const emitCount = Math.min(particlesPerFrame, totalParticles - frame * particlesPerFrame);
    if (emitCount > 0 && particles.length < maxParticles) {
      for (let i = 0; i < emitCount; i++) {
        if (particles.length < maxParticles) {
          particles.push(createParticle(config));
        }
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      drawParticle(pixels, particle, config.width, config.height);
      const alive = updateParticle(particle);
      if (!alive) {
        particles.splice(i, 1);
      }
    }

    frames.push({ pixels });
  }

  return frames;
};

export const generateExplosionFrames = (
  width: number,
  height: number,
  frameCount: number,
  options?: Partial<ParticleConfig>
): ParticleFrame[] => {
  const config: ParticleConfig = {
    type: 'explosion',
    width,
    height,
    frameCount,
    particleCount: 40,
    colors: [2, 5, 1, 9],
    emitX: 0.5,
    emitY: 0.5,
    emitRadius: 0.05,
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
    emissionRate: 1.5,
    ...options,
  };
  return generateParticleFrames(config);
};

export const generateFireFrames = (
  width: number,
  height: number,
  frameCount: number,
  options?: Partial<ParticleConfig>
): ParticleFrame[] => {
  const config: ParticleConfig = {
    type: 'fire',
    width,
    height,
    frameCount,
    particleCount: 30,
    colors: [2, 5, 9, 1],
    emitX: 0.5,
    emitY: 0.95,
    emitRadius: 0.15,
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
    ...options,
  };
  return generateParticleFrames(config);
};

export const generateSmokeFrames = (
  width: number,
  height: number,
  frameCount: number,
  options?: Partial<ParticleConfig>
): ParticleFrame[] => {
  const config: ParticleConfig = {
    type: 'smoke',
    width,
    height,
    frameCount,
    particleCount: 25,
    colors: [12, 13, 1, 12],
    emitX: 0.5,
    emitY: 0.85,
    emitRadius: 0.12,
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
    ...options,
  };
  return generateParticleFrames(config);
};

export const generateMagicFrames = (
  width: number,
  height: number,
  frameCount: number,
  options?: Partial<ParticleConfig>
): ParticleFrame[] => {
  const config: ParticleConfig = {
    type: 'magic',
    width,
    height,
    frameCount,
    particleCount: 35,
    colors: [8, 7, 10, 1],
    emitX: 0.5,
    emitY: 0.5,
    emitRadius: 0.02,
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
    ...options,
  };
  return generateParticleFrames(config);
};
