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
  {"id": "petals", "title": "Petals", "description": "Find the mines using number clues.", "status": "playable", "accent": "#e7adc5", "monogram": "Pe", "href": "./games/petals/", "icon": "./icons/petals.png"},
  {"id": "traffic-garden", "title": "Traffic Garden", "description": "Slide cars to free the red car.", "status": "playable", "href": "./games/traffic-garden/", "accent": "#d9b998", "monogram": "TG", "icon": "./icons/traffic-garden.png"},
  {"id": "crate-garden", "title": "Crate Garden", "description": "Push each crate onto a target.", "status": "playable", "href": "./games/crate-garden/", "accent": "#b7c7a0", "monogram": "CG", "icon": "./icons/crate-garden.png"},
  {"id": "water-garden", "title": "Water Garden", "description": "Turn pipes to water the flowers.", "status": "playable", "href": "./games/water-garden/", "accent": "#9fc8c6", "monogram": "WG", "icon": "./icons/water-garden.png"},
  {"id": "crystal-light", "title": "Crystal Light", "description": "Turn mirrors to light the crystals.", "status": "playable", "href": "./games/crystal-light/", "accent": "#b5add7", "monogram": "CL", "icon": "./icons/crystal-light.png"},
  {"id": "frosty-paths", "title": "Frosty Paths", "description": "Collect fish and slide the penguin home.", "status": "playable", "href": "./games/frosty-paths/", "accent": "#b4cddc", "monogram": "FP", "icon": "./icons/frosty-paths.png"},
  {"id": "marble-workshop", "title": "Marble Workshop", "description": "Turn tracks and roll the marble into the cup.", "status": "planned", "accent": "#d4bba4", "monogram": "MW", "icon": "./icons/marble-workshop.png"},
  {"id": "shadow-blocks", "title": "Shadow Blocks", "description": "Move blocks to match a shadow.", "status": "planned", "accent": "#bcb6cd", "monogram": "SB", "icon": "./icons/shadow-blocks.png"},
  {"id": "picture-islands", "title": "Picture Islands", "description": "Use number clues to reveal a picture.", "status": "planned", "accent": "#c7b9d7", "monogram": "PI", "icon": "./icons/picture-islands.png"},
  {"id": "pocket-railroads", "title": "Pocket Railroads", "description": "Guide trains to their stations.", "status": "planned", "accent": "#b7c4bd", "monogram": "PR", "icon": "./icons/pocket-railroads.png"},
  {"id": "robot-garden", "title": "Robot Garden", "description": "Give a robot steps to collect items.", "status": "planned", "accent": "#b7c9b8", "monogram": "RG", "icon": "./icons/robot-garden.png"},
  {"id": "bridge-islands", "title": "Bridge Islands", "description": "Link islands with the right number of bridges.", "status": "planned", "accent": "#b6c9d1", "monogram": "BI", "icon": "./icons/bridge-islands.png"},
  {"id": "flip-garden", "title": "Flip Garden", "description": "Flip tiles to match the pattern.", "status": "planned", "accent": "#d8b8c8", "monogram": "FG", "icon": "./icons/flip-garden.png"},
  {"id": "tiny-tangrams", "title": "Tiny Tangrams", "description": "Fit the pieces inside the outline.", "status": "planned", "accent": "#e1c59a", "monogram": "TT", "icon": "./icons/tiny-tangrams.png"},
  {"id": "color-stacks", "title": "Color Stacks", "description": "Sort blocks into stacks by color.", "status": "planned", "accent": "#d9abc0", "monogram": "CS", "icon": "./icons/color-stacks.png"},
  {"id": "garden-sudoku", "title": "Garden Sudoku", "description": "Place each plant once in each row, column, and box.", "status": "planned", "accent": "#bdc9a6", "monogram": "GS", "icon": "./icons/garden-sudoku.png"},
  {"id": "rolling-stone", "title": "Rolling Stone", "description": "Roll the block to the goal.", "status": "planned", "accent": "#c0bacb", "monogram": "RS", "icon": "./icons/rolling-stone.png"},
  {"id": "stepping-stones", "title": "Stepping Stones", "description": "Draw a path through all marked tiles.", "status": "planned", "accent": "#c4c9ad", "monogram": "SS", "icon": "./icons/stepping-stones.png"},
  {"id": "water-balance", "title": "Water Balance", "description": "Pour water to match the target amounts.", "status": "planned", "accent": "#a9c8cc", "monogram": "WB", "icon": "./icons/water-balance.png"},
  {"id": "perspective-paths", "title": "Perspective Paths", "description": "Turn the board to line up the paths.", "status": "planned", "accent": "#bfb9d8", "monogram": "PP", "icon": "./icons/perspective-paths.png"},
  {"id": "pocket-escape", "title": "Pocket Escape", "description": "Find clues and unlock the room.", "status": "planned", "accent": "#d3bca2", "monogram": "PE", "icon": "./icons/pocket-escape.png"},
];
