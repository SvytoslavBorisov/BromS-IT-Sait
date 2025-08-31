export type HSL = {
  h: number; // 0–360
  s: number; // 0–100
  l: number; // 0–100
};

export enum Tool {
  Red = "red",
  Green = "green",
  Blue = "blue",
  Yellow = "yellow",
  White = "white",
  Black = "black",
  Solvent = "solvent",
  Randomizer = "randomizer", // приколюха
  Inverter = "inverter",     // приколюха
}

export type ToolDef = {
  id: Tool;
  name: string;
  effect: (color: HSL) => HSL;
};
