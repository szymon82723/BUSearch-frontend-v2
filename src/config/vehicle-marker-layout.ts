export interface MarkerBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Work in screen pixels: GPS coordinates remain unchanged. A stable ID order
// prevents a feed changing order from shuffling buses around a terminus.
export function layoutVehicleMarkers(boxes: MarkerBox[], allowed: (box: MarkerBox) => boolean = () => true): Map<string, [number, number]> {
  const offsets = new Map<string, [number, number]>();
  const placed: MarkerBox[] = [];
  for (const box of [...boxes].sort((a, b) => a.id.localeCompare(b.id))) {
    const free = (x: number, y: number) => placed.every(other =>
      Math.abs(x - other.x) >= (box.width + other.width) / 2 + 8 ||
      Math.abs(y - other.y) >= (box.height + other.height) / 2 + 8);
    let dx = 0;
    let dy = 0;
    if (!free(box.x, box.y)) {
      search: for (let ring = 1; ring <= boxes.length; ring++) {
        const candidates: [number, number][] = [];
        for (let col = -ring; col <= ring; col++) {
          for (let row = -ring; row <= ring; row++) {
            if (Math.max(Math.abs(col), Math.abs(row)) !== ring) continue;
            candidates.push([col * (box.width + 8), row * (box.height + 8)]);
          }
        }
        candidates.sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
        for (const [x, y] of candidates) {
          if (free(box.x + x, box.y + y) && allowed({ ...box, x: box.x + x, y: box.y + y })) {
            dx = x;
            dy = y;
            break search;
          }
        }
      }
    }
    offsets.set(box.id, [dx, dy]);
    placed.push({ ...box, x: box.x + dx, y: box.y + dy });
  }
  return offsets;
}
