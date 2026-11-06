export type PositionedText = { text: string; x: number; y: number; width: number };

/** Acima dessa distância, dois pedaços de texto são palavras diferentes. */
const WORD_GAP = 1;

function joinItems(items: PositionedText[]): string {
  let line = '';
  let end = -Infinity;
  for (const item of items) {
    // O PDF pode partir uma palavra em pedaços: "Ste", "ff", "ane".
    line += item.x - end > WORD_GAP ? ` ${item.text}` : item.text;
    end = item.x + item.width;
  }
  return line.replace(/\s+/g, ' ').trim();
}

/** Itens com Y próximo formam uma linha: o PDF guarda texto solto, não linhas. */
export function groupIntoLines(items: PositionedText[], tolerance = 3): string[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: { y: number; items: PositionedText[] }[] = [];
  for (const item of sorted) {
    const line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= tolerance);
    if (line) line.items.push(item);
    else lines.push({ y: item.y, items: [item] });
  }
  return lines.map((line) => joinItems(line.items.sort((a, b) => a.x - b.x)));
}
