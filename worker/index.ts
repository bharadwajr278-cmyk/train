/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  RAILRADAR_API_KEY?: string;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/trains") {
      const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store, max-age=0" };
      const fromInput = (url.searchParams.get("from") || "").trim();
      const toInput = (url.searchParams.get("to") || "").trim();
      const date = (url.searchParams.get("date") || "").trim();
      if (!env.RAILRADAR_API_KEY) return new Response(JSON.stringify({ error: "Live train service is not configured." }), { status: 503, headers });
      if (!fromInput || !toInput || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return new Response(JSON.stringify({ error: "From, to and a valid date are required." }), { status: 400, headers });

      const auth = { Authorization: `Bearer ${env.RAILRADAR_API_KEY}`, Accept: "application/json" };
      const rr = async (path: string) => {
        const response = await fetch(`https://api.railradar.in/v1${path}`, { headers: auth, cf: { cacheTtl: 0 } } as RequestInit);
        const body: any = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.message || body?.error || `Rail service returned ${response.status}`);
        return body?.data ?? body;
      };
      const stationCode = async (input: string) => {
        const raw = input.match(/\(([A-Z0-9]{2,6})\)\s*$/i)?.[1] || input;
        if (/^[A-Z0-9]{2,6}$/i.test(raw)) return raw.toUpperCase();
        const stations: Record<string, string> = await rr("/lookup/stations");
        const q = input.toLowerCase();
        const exact = Object.entries(stations).find(([code, name]) => code.toLowerCase() === q || name.toLowerCase() === q);
        const partial = Object.entries(stations).find(([, name]) => name.toLowerCase().includes(q));
        const found = exact || partial;
        if (!found) throw new Error(`Station not found: ${input}. Station code try karein, jaise NDLS.`);
        return found[0];
      };

      try {
        const [from, to] = await Promise.all([stationCode(fromInput), stationCode(toInput)]);
        const between = await rr(`/trains/between/${encodeURIComponent(from)}/${encodeURIComponent(to)}?date=${date}&byCity=true&live=true&_=${Date.now()}`);
        const rawTrains: any[] = Array.isArray(between?.trains) ? between.trains : [];
        // Free API allows 10 requests/minute: 1 route request + 2 live detail
        // requests for each of the first 4 trains keeps one search within quota.
        const trains = await Promise.all(rawTrains.slice(0, 4).map(async (item: any) => {
          const train = item.train || item;
          const number = String(train.number || train.trainNumber || "");
          const trainInfo: any = {};
          const rawClasses = train.classes || [];
          const classes: string[] = (Array.isArray(rawClasses) ? rawClasses : String(rawClasses).split(",")).map((c: string) => c.trim().toUpperCase());
          const chairCar = /vande bharat|shatabdi|jan shatabdi/i.test(`${train.name} ${train.type}`);
          const classCode = ["3A", "CC", "SL", "2A", "EC", "1A", "2S"].find(c => classes.includes(c)) || (chairCar ? "CC" : "3A");
          const query = `journeyDate=${date}&source=${from}&destination=${to}&classCode=${classCode}&quotaCode=GN&_=${Date.now()}`;
          const [seatData, fareData] = await Promise.all([
            rr(`/trains/${number}/seats?${query}`).catch(() => null),
            rr(`/trains/${number}/fare?${query}`).catch(() => null),
          ]);
          const day = seatData?.calendar?.find((d: any) => d.date === date) || seatData?.calendar?.[0] || seatData?.avlDayList?.[0];
          const availability = day?.status || day?.availablityStatus || day?.availabilityStatus || seatData?.availability || "Status unavailable";
          return {
            number, name: train.name || trainInfo.name || `Train ${number}`, type: train.type || trainInfo.type || "Train",
            departure: item.from?.departure || item.departure || "—", arrival: item.to?.arrival || item.arrival || "—",
            fromName: between?.from?.name || fromInput, toName: between?.to?.name || toInput,
            duration: typeof item.duration === "number" ? `${Math.floor(item.duration / 60)}h ${item.duration % 60}m` : (item.duration || "—"), distance: item.distance ?? null, classCode, availability,
            fare: fareData?.totalFare ?? fareData?.breakdown?.totalFare ?? fareData?.fare ?? null,
            delayMinutes: item.live?.delayMinutes ?? null, platform: item.live?.platform ?? null,
            runDays: train.runDays || trainInfo.runsOn || [],
          };
        }));
        return new Response(JSON.stringify({ from: { code: from, name: between?.from?.name || fromInput }, to: { code: to, name: between?.to?.name || toInput }, date, count: trains.length, trains, fetchedAt: new Date().toISOString() }), { headers });
      } catch (error) {
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Live train search failed." }), { status: 502, headers });
      }
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
