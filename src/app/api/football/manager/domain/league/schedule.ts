export function roundRobin(teamIds: number[]): [number, number][][] {
  // Бергеровский алгоритм (круговой турнир)
  const n = teamIds.length;
  if (n < 2) return [];
  const isOdd = n % 2 === 1;
  const teams = isOdd ? [...teamIds, -1] : [...teamIds];
  const m = teams.length;

  const rounds: [number, number][][] = [];
  for (let r = 0; r < m - 1; r++) {
    const pairs: [number, number][] = [];
    for (let i = 0; i < m / 2; i++) {
      const a = teams[i];
      const b = teams[m - 1 - i];
      if (a !== -1 && b !== -1) pairs.push([a, b]);
    }
    rounds.push(pairs);
    // ротация
    const fixed = teams[0];
    const rest = teams.slice(1);
    rest.unshift(rest.pop()!);
    teams.splice(0, teams.length, fixed, ...rest);
  }
  return rounds;
}
