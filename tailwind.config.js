/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        'pixel-bg': '#1a1a2e',
        'pixel-panel': '#16213e',
        'pixel-surface': '#0f3460',
        'pixel-accent': '#e94560',
        'pixel-success': '#16c79a',
        'pixel-warn': '#f5a623',
        'pixel-text': '#c2c3c7',
        'pixel-muted': '#83769c',
        'pixel-dim': '#5f574f',
      },
    },
  },
  plugins: [],
};
