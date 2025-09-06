// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface DirectionsRequest {
  fromName?: string;
  toName?: string;
  fromCoord?: [number, number]; // [lng, lat]
  toCoord?: [number, number];   // [lng, lat]
  country?: string; // optional ISO country filter for geocoding
}

const MAPBOX_TOKEN = Deno.env.get("MAPBOX_PUBLIC_TOKEN");

async function geocode(name: string, country?: string) {
  const q = encodeURIComponent(name);
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json`);
  url.searchParams.set("access_token", MAPBOX_TOKEN || "");
  url.searchParams.set("limit", "1");
  if (country) url.searchParams.set("country", country);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) throw new Error("No results for geocoding");
  const [lng, lat] = feature.center as [number, number];
  return { lng, lat };
}

async function directions(from: [number, number], to: [number, number]) {
  const coords = `${from[0]},${from[1]};${to[0]},${to[1]}`;
  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${coords}`);
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");
  url.searchParams.set("access_token", MAPBOX_TOKEN || "");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Directions failed: ${res.status}`);
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) throw new Error("No routes found");
  return route.geometry.coordinates as [number, number][]; // [lng, lat][]
}

serve(async (req) => {
  if (!MAPBOX_TOKEN) {
    return new Response(
      JSON.stringify({ error: "Missing MAPBOX_PUBLIC_TOKEN secret" }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  try {
    const body = (await req.json()) as DirectionsRequest;

    let from: [number, number] | undefined = body.fromCoord;
    let to: [number, number] | undefined = body.toCoord;

    if (!from && body.fromName) {
      const gf = await geocode(body.fromName, body.country);
      from = [gf.lng, gf.lat];
    }
    if (!to && body.toName) {
      const gt = await geocode(body.toName, body.country);
      to = [gt.lng, gt.lat];
    }

    if (!from || !to) {
      return new Response(
        JSON.stringify({ error: "Provide from/to names or coordinates" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    const coords = await directions(from, to); // [lng, lat][]

    return new Response(
      JSON.stringify({ coordinates: coords }),
      { headers: { "content-type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message || "Unknown error" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
});
