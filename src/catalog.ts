export interface GameEntry {
  id: string;
  title: string;
  description: string;
  status: 'playable' | 'planned';
  href?: string;
  accent: string;
  monogram: string;
  icon?: string;
}

// Add icon URLs only after the reviewed image files exist.
export const games: readonly GameEntry[] = [
  {"id": "petals", "title": "Petals", "description": "Reveal safe tiles and follow clues across floating floors.", "status": "playable", "accent": "#e7adc5", "monogram": "Pe", "href": "./games/petals/", "icon": "./icons/petals.png"},
  {"id": "traffic-garden", "title": "Traffic Garden", "description": "Slide little cars to clear a path to the exit.", "status": "playable", "href": "./games/traffic-garden/", "accent": "#d9b998", "monogram": "TG", "icon": "./icons/traffic-garden.png"},
  {"id": "crate-garden", "title": "Crate Garden", "description": "Push seed crates onto the right planting spots.", "status": "playable", "href": "./games/crate-garden/", "accent": "#b7c7a0", "monogram": "CG", "icon": "./icons/crate-garden.png"},
  {"id": "water-garden", "title": "Water Garden", "description": "Turn channels to carry water to every flower.", "status": "playable", "href": "./games/water-garden/", "accent": "#9fc8c6", "monogram": "WG", "icon": "./icons/water-garden.png"},
  {"id": "crystal-light", "title": "Crystal Light", "description": "Guide beams through mirrors into waiting crystals.", "status": "playable", "href": "./games/crystal-light/", "accent": "#b5add7", "monogram": "CL", "icon": "./icons/crystal-light.png"},
  {"id": "frosty-paths", "title": "Frosty Paths", "description": "Slide penguins across ice to reach their goals.", "status": "planned", "accent": "#b4cddc", "monogram": "FP", "icon": "./icons/frosty-paths.png"},
  {"id": "marble-workshop", "title": "Marble Workshop", "description": "Arrange a track that brings the marble home.", "status": "planned", "accent": "#d4bba4", "monogram": "MW", "icon": "./icons/marble-workshop.png"},
  {"id": "shadow-blocks", "title": "Shadow Blocks", "description": "Arrange blocks to match the hidden silhouette.", "status": "planned", "accent": "#bcb6cd", "monogram": "SB", "icon": "./icons/shadow-blocks.png"},
  {"id": "picture-islands", "title": "Picture Islands", "description": "Use row and column clues to uncover a picture.", "status": "planned", "accent": "#c7b9d7", "monogram": "PI", "icon": "./icons/picture-islands.png"},
  {"id": "pocket-railroads", "title": "Pocket Railroads", "description": "Route little trains safely to their stations.", "status": "planned", "accent": "#b7c4bd", "monogram": "PR", "icon": "./icons/pocket-railroads.png"},
  {"id": "robot-garden", "title": "Robot Garden", "description": "Program a small robot to collect garden treasures.", "status": "planned", "accent": "#b7c9b8", "monogram": "RG", "icon": "./icons/robot-garden.png"},
  {"id": "bridge-islands", "title": "Bridge Islands", "description": "Connect islands with the right number of bridges.", "status": "planned", "accent": "#b6c9d1", "monogram": "BI", "icon": "./icons/bridge-islands.png"},
  {"id": "flip-garden", "title": "Flip Garden", "description": "Flip neighboring tiles into one complete pattern.", "status": "planned", "accent": "#d8b8c8", "monogram": "FG", "icon": "./icons/flip-garden.png"},
  {"id": "tiny-tangrams", "title": "Tiny Tangrams", "description": "Fit tactile shapes into a matching outline.", "status": "planned", "accent": "#e1c59a", "monogram": "TT", "icon": "./icons/tiny-tangrams.png"},
  {"id": "color-stacks", "title": "Color Stacks", "description": "Sort colored cubes into tidy matching towers.", "status": "planned", "accent": "#d9abc0", "monogram": "CS", "icon": "./icons/color-stacks.png"},
  {"id": "garden-sudoku", "title": "Garden Sudoku", "description": "Place each plant once in every row and region.", "status": "planned", "accent": "#bdc9a6", "monogram": "GS", "icon": "./icons/garden-sudoku.png"},
  {"id": "rolling-stone", "title": "Rolling Stone", "description": "Roll a block across platforms into its goal.", "status": "planned", "accent": "#c0bacb", "monogram": "RS", "icon": "./icons/rolling-stone.png"},
  {"id": "stepping-stones", "title": "Stepping Stones", "description": "Find one path through every required tile.", "status": "planned", "accent": "#c4c9ad", "monogram": "SS", "icon": "./icons/stepping-stones.png"},
  {"id": "water-balance", "title": "Water Balance", "description": "Transfer water to reach the exact quantities.", "status": "planned", "accent": "#a9c8cc", "monogram": "WB", "icon": "./icons/water-balance.png"},
  {"id": "perspective-paths", "title": "Perspective Paths", "description": "Rotate a tiny world until its paths line up.", "status": "planned", "accent": "#bfb9d8", "monogram": "PP", "icon": "./icons/perspective-paths.png"},
  {"id": "pocket-escape", "title": "Pocket Escape", "description": "Uncover clues and open the miniature room.", "status": "planned", "accent": "#d3bca2", "monogram": "PE", "icon": "./icons/pocket-escape.png"},
];
