/** Final skill rating: 70% test score + 30% integrity score */
export function calculateFinalSkillScore(testScore: number, integrityScore: number): number {
  const final = testScore * 0.7 + integrityScore * 0.3;
  return Math.round(Math.max(0, Math.min(100, final)));
}
