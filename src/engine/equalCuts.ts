export type EqualCutResult = { pieceLength: number; kerfLoss: number; totalCuts: number; remainder: number };
export function calculateEqualCuts(totalLength: number, pieces: number, kerf: number): EqualCutResult {
  if (!Number.isFinite(totalLength) || !Number.isFinite(pieces) || !Number.isFinite(kerf) || totalLength <= 0 || pieces < 1 || !Number.isInteger(pieces) || kerf < 0) throw new Error('Podaj poprawne wartości.');
  const totalCuts = pieces - 1;
  const kerfLoss = totalCuts * kerf;
  const available = totalLength - kerfLoss;
  if (available <= 0) throw new Error('Rzaz jest większy niż dostępna długość materiału.');
  const pieceLength = available / pieces;
  return { pieceLength, kerfLoss, totalCuts, remainder: totalLength - (pieceLength * pieces + kerfLoss) };
}
