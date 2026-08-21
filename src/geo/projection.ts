/**
 * Proiezione e decodifica della base cartografica.
 *
 * TRAPPOLA: l'alfabeto della codifica polyline occupa i caratteri ASCII
 * 63..126. Il separatore fra tratti deve stare FUORI da quell'intervallo —
 * `|` è il 124 e ci cade dentro, spezzando le linee a metà.
 */
export const LINE_SEPARATOR = ";";
const PRECISION = 1000;

export type LonLat = [number, number];

export function decodeLines(encoded: string): LonLat[][] {
  if (!encoded) return [];
  return encoded.split(LINE_SEPARATOR).map(segment => {
    const points: LonLat[] = [];
    let i = 0, x = 0, y = 0;
    while (i < segment.length) {
      let result = 0, shift = 0, byte: number;
      do {
        byte = segment.charCodeAt(i++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      x += (result & 1) ? ~(result >> 1) : (result >> 1);

      result = 0; shift = 0;
      do {
        byte = segment.charCodeAt(i++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      y += (result & 1) ? ~(result >> 1) : (result >> 1);

      points.push([x / PRECISION, y / PRECISION]);
    }
    return points;
  });
}

/** Vero se la stringa resta dentro l'alfabeto ammesso. */
export function isEncodingSafe(encoded: string): boolean {
  return encoded.split(LINE_SEPARATOR).every(seg => !/[^\x3F-\x7E]/.test(seg));
}

/**
 * Mercatore. La y cresce verso nord; il ribaltamento per lo schermo avviene
 * UNA SOLA VOLTA, quando si costruiscono i tracciati. Applicarlo anche nella
 * trasformazione del gruppo SVG spedisce la costa fuori campo.
 */
export function merc(lat: number, lon: number): [number, number] {
  const phi = Math.max(-85, Math.min(85, lat)) * Math.PI / 180;
  return [lon, Math.log(Math.tan(Math.PI / 4 + phi / 2)) * 180 / Math.PI];
}
