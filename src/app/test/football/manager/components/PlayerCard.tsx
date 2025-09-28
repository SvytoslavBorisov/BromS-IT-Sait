type Props = {
  name: string;
  position: string;
  team?: string | null;
  stats: { pace: number; pass: number; shot: number; dribble: number; defense: number; stamina: number };
};

export function PlayerCard({ name, position, team, stats }: Props) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">{name}</div>
        <div className="text-xs rounded-full px-2 py-0.5 border">
          {position}
        </div>
      </div>
      <div className="text-sm muted mb-2">{team ?? "без команды"}</div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>PACE: {stats.pace}</div>
        <div>PASS: {stats.pass}</div>
        <div>SHOT: {stats.shot}</div>
        <div>DRI: {stats.dribble}</div>
        <div>DEF: {stats.defense}</div>
        <div>STA: {stats.stamina}</div>
      </div>
    </div>
  );
}
