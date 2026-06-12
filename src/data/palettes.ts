export interface PresetPalette {
  id: string;
  name: string;
  author: string;
  colors: string[];
}

export const PRESET_PALETTES: PresetPalette[] = [
  {
    id: 'pico-8',
    name: 'PICO-8',
    author: 'Lexaloffle',
    colors: [
      '#000000', '#1D2B53', '#7E2553', '#008751',
      '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8',
      '#FF004D', '#FFA300', '#FFEC27', '#00E436',
      '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA',
    ],
  },
  {
    id: 'dawnbringer-32',
    name: 'DawnBringer 32',
    author: 'DawnBringer',
    colors: [
      '#000000', '#222034', '#45283c', '#663931',
      '#8f563b', '#df7126', '#d9a066', '#eec39a',
      '#fbf236', '#99e550', '#6abe30', '#37946e',
      '#4b692f', '#524b24', '#323c39', '#3f3f74',
      '#306082', '#5b6ee1', '#639bff', '#5fcde4',
      '#cbdbfc', '#ffffff', '#9badb7', '#847e87',
      '#696a6a', '#595652', '#76428a', '#ac3232',
      '#d95763', '#d77bba', '#8f974a', '#8a6f30',
    ],
  },
  {
    id: 'endesga-32',
    name: 'Endesga 32',
    author: 'Endesga',
    colors: [
      '#be4a2f', '#d77643', '#ead4aa', '#e4a672',
      '#b86f50', '#733e39', '#3e2731', '#a22633',
      '#e43b44', '#f77622', '#feae34', '#fee761',
      '#63c74d', '#3e8948', '#265c42', '#193c3e',
      '#124e89', '#0099db', '#2ce8f5', '#ffffff',
      '#c0cbdc', '#8b9bb4', '#5a6988', '#3a4466',
      '#262b44', '#181425', '#ff0044', '#68386c',
      '#b55088', '#f6757a', '#e8b796', '#c28569',
    ],
  },
  {
    id: 'endesga-64',
    name: 'Endesga 64',
    author: 'Endesga',
    colors: [
      '#ff004d', '#29adff', '#ff77a8', '#ffccaa',
      '#fff1e8', '#00e436', '#1d2b53', '#7e2553',
      '#008751', '#ab5236', '#5f574f', '#c2c3c7',
      '#ffa300', '#ffec27', '#83769c', '#be4a2f',
      '#d77643', '#ead4aa', '#e4a672', '#b86f50',
      '#733e39', '#3e2731', '#a22633', '#e43b44',
      '#f77622', '#feae34', '#fee761', '#63c74d',
      '#3e8948', '#265c42', '#193c3e', '#124e89',
      '#0099db', '#2ce8f5', '#c0cbdc', '#8b9bb4',
      '#5a6988', '#3a4466', '#262b44', '#181425',
      '#68386c', '#b55088', '#f6757a', '#e8b796',
      '#c28569', '#df7126', '#d9a066', '#eec39a',
      '#fbf236', '#99e550', '#6abe30', '#37946e',
      '#4b692f', '#524b24', '#323c39', '#3f3f74',
      '#306082', '#5b6ee1', '#639bff', '#5fcde4',
      '#cbdbfc', '#9badb7', '#847e87', '#696a6a',
    ],
  },
  {
    id: 'dawnbringer-16',
    name: 'DawnBringer 16',
    author: 'DawnBringer',
    colors: [
      '#140c1c', '#442434', '#30346d', '#4e4a4e',
      '#854c30', '#346524', '#d04648', '#757161',
      '#597dce', '#d27d2c', '#8595a1', '#6daa2c',
      '#d2aa99', '#6dc2ca', '#dad45e', '#deeed6',
    ],
  },
  {
    id: 'sweetie-16',
    name: 'Sweetie 16',
    author: 'GrafxKid',
    colors: [
      '#1a1c2c', '#5d275d', '#b13e53', '#ef7d57',
      '#ffcd75', '#a7f070', '#38b764', '#257179',
      '#29366f', '#3b5dc9', '#41a6f6', '#73eff7',
      '#f4f4f4', '#94b0c2', '#566c86', '#333c57',
    ],
  },
  {
    id: 'resurrect-64',
    name: 'Resurrect 64',
    author: 'Abstruse',
    colors: [
      '#2c2137', '#764462', '#8055a2', '#5965ad',
      '#3881ab', '#4aa5a0', '#68a460', '#8d9144',
      '#be8a3d', '#d4722a', '#c94c28', '#a43644',
      '#6c2243', '#3e1d39', '#1e1c34', '#0e0e18',
      '#403250', '#9a6980', '#a98cb5', '#8c96c6',
      '#6ea8d2', '#6bc5c3', '#8fc274', '#b2bf52',
      '#dcb448', '#e49438', '#d46b4c', '#b5485e',
      '#883a5f', '#4f2d57', '#27274a', '#141322',
      '#584574', '#bf7da3', '#c3a4cc', '#a6a7d2',
      '#82c2dd', '#81d5d3', '#a3d78e', '#c5d06b',
      '#f0d654', '#f2aa3e', '#e47d50', '#ca616e',
      '#9f506e', '#6b4069', '#3b305f', '#1c1b3a',
      '#6f5a8e', '#d896b8', '#dbbfde', '#c4b3d8',
      '#a3d3e5', '#98e3e2', '#b6e5a4', '#d5df88',
      '#f5e276', '#f4b95e', '#e99068', '#d37e80',
      '#b66b84', '#8a5880', '#544076', '#28265a',
    ],
  },
  {
    id: 'nyx8',
    name: 'Nyx 8',
    author: 'Nyx',
    colors: [
      '#081419', '#2b1b28', '#7b2d53', '#d72475',
      '#f7725c', '#ff9e47', '#ffd566', '#ffffff',
    ],
  },
  {
    id: 'famicom',
    name: 'Famicom',
    author: 'Nintendo',
    colors: [
      '#000000', '#fcfcfc', '#f8f8f8', '#bcbcbc',
      '#7c7c7c', '#a4e4fc', '#3cbcfc', '#0078f8',
      '#0000fc', '#b8b8f8', '#6888fc', '#0058f8',
      '#0000bc', '#d8b8f8', '#9878f8', '#6844fc',
      '#4428bc', '#f8b8f8', '#f878f8', '#d800cc',
      '#940084', '#f8a4c0', '#f85898', '#e40058',
      '#a80020', '#f0d0b0', '#f87858', '#f83800',
      '#a81000', '#fce0a8', '#fca044', '#e45c10',
      '#881400', '#f8d878', '#f8b800', '#ac7c00',
      '#503000', '#d8f878', '#b8f818', '#00b800',
      '#007800', '#b8f8b8', '#58d854', '#00a800',
      '#006800', '#b8f8d8', '#58f898', '#00a844',
      '#005800', '#00fcfc', '#00e8d8', '#008888',
      '#004058', '#f8d8f8', '#787878', '#404040',
    ],
  },
  {
    id: 'pastel',
    name: 'Pastel',
    author: 'Skeddles',
    colors: [
      '#1b1b27', '#3e3854', '#7b6b8a', '#bba0c9',
      '#dcc8e0', '#e8d3d5', '#c9a0aa', '#9b6b7b',
      '#6d4068', '#4d2d4d', '#a8c5d6', '#6ba3be',
      '#4a8497', '#325e70', '#1b3b4d', '#b8ddb0',
      '#7dba6e', '#509944', '#357735', '#1d5527',
      '#f0e09c', '#dbb86b', '#c19040', '#a46b24',
      '#784818', '#f5b078', '#e08050', '#c95535',
      '#a52a20', '#781810', '#f090a0', '#d06080',
    ],
  },
];

export const findPresetPalette = (id: string): PresetPalette | undefined => {
  return PRESET_PALETTES.find((p) => p.id === id);
};
