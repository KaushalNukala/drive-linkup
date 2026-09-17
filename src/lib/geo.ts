export type LatLng = [number, number];

const cacheKey = (name: string) => `geo:${name.trim().toLowerCase()}`;

/** Geocode a place name using OpenStreetMap Nominatim (no API key needed). */
export async function geocodePlace(name: string): Promise<LatLng | null> {
  if (!name?.trim()) return null;

  try {
    const cached = localStorage.getItem(cacheKey(name));
    if (cached) return JSON.parse(cached) as LatLng;
  } catch {}

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', name);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'in');

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const hit = Array.isArray(data) ? data[0] : null;
    if (!hit) return null;
    const point: LatLng = [parseFloat(hit.lat), parseFloat(hit.lon)];
    try {
      localStorage.setItem(cacheKey(name), JSON.stringify(point));
    } catch {}
    return point;
  } catch {
    return null;
  }
}

/** Get a driving route between two points using the public OSRM service. */
export async function fetchRoadRoute(from: LatLng, to: LatLng): Promise<LatLng[]> {
  try {
    const coords = `${from[1]},${from[0]};${to[1]},${to[0]}`;
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
    );
    if (!res.ok) return [from, to];
    const data = await res.json();
    const line = data?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined;
    if (!line?.length) return [from, to];
    return line.map(([lng, lat]) => [lat, lng] as LatLng);
  } catch {
    return [from, to];
  }
}
