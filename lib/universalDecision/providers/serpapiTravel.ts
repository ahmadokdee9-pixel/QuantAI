/**
 * Real SerpAPI Google Flights / Hotels providers (same SERPAPI_KEY as shopping).
 */

export type SerpFlightOffer = {
  id: string;
  title: string;
  airline: string;
  price: number | null;
  currency: string;
  stops: number;
  durationMinutes: number | null;
  link: string | null;
  departure: string | null;
  arrival: string | null;
  raw: Record<string, unknown>;
};

export type SerpHotelOffer = {
  id: string;
  title: string;
  price: number | null;
  currency: string;
  rating: number | null;
  link: string | null;
  neighborhood: string | null;
  raw: Record<string, unknown>;
};

function apiKey(env: NodeJS.ProcessEnv = process.env): string | null {
  const key = env.SERPAPI_KEY?.trim();
  return key || null;
}

function cityToAirportHint(city: string): string {
  const map: Record<string, string> = {
    amsterdam: "AMS",
    istanbul: "IST",
    paris: "CDG",
    london: "LHR",
    berlin: "BER",
    madrid: "MAD",
    rome: "FCO",
    dubai: "DXB",
    "new york": "JFK",
    "los angeles": "LAX",
  };
  return map[city.trim().toLowerCase()] || city.trim().slice(0, 3).toUpperCase();
}

export async function fetchGoogleFlights(args: {
  departureId?: string;
  arrivalId?: string;
  departureCity?: string;
  arrivalCity?: string;
  outboundDate?: string;
  returnDate?: string | null;
  currency?: string;
  gl?: string;
  signal?: AbortSignal;
}): Promise<{ offers: SerpFlightOffer[]; fetchedAt: string; error?: string }> {
  const key = apiKey();
  const fetchedAt = new Date().toISOString();
  if (!key) return { offers: [], fetchedAt, error: "SERPAPI_KEY missing" };

  const departure = args.departureId || cityToAirportHint(args.departureCity || "");
  const arrival = args.arrivalId || cityToAirportHint(args.arrivalCity || "");
  if (!departure || !arrival || departure.length < 3 || arrival.length < 3) {
    return { offers: [], fetchedAt, error: "Need origin and destination airports/cities" };
  }

  const outbound =
    args.outboundDate ||
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const params = new URLSearchParams({
    engine: "google_flights",
    api_key: key,
    departure_id: departure,
    arrival_id: arrival,
    outbound_date: outbound,
    currency: args.currency || "EUR",
    hl: "en",
    gl: (args.gl || "nl").toLowerCase(),
    type: args.returnDate ? "1" : "2",
  });
  if (args.returnDate) params.set("return_date", args.returnDate);

  try {
    const res = await fetch(`https://serpapi.com/search.json?${params}`, {
      signal: args.signal,
    });
    if (!res.ok) {
      return { offers: [], fetchedAt, error: `SerpAPI flights HTTP ${res.status}` };
    }
    const json = (await res.json()) as Record<string, unknown>;
    if (json.error) {
      return { offers: [], fetchedAt, error: String(json.error) };
    }

    const best = Array.isArray(json.best_flights) ? json.best_flights : [];
    const other = Array.isArray(json.other_flights) ? json.other_flights : [];
    const rows = [...best, ...other].slice(0, 12);

    const offers: SerpFlightOffer[] = rows.map((row, index) => {
      const item = row as Record<string, unknown>;
      const flights = Array.isArray(item.flights) ? item.flights : [];
      const first = (flights[0] || {}) as Record<string, unknown>;
      const last = (flights[flights.length - 1] || first) as Record<string, unknown>;
      const airline = String(first.airline || item.airline || "Airline");
      const price =
        typeof item.price === "number"
          ? item.price
          : typeof item.price === "string"
            ? Number(item.price)
            : null;
      const dep = (first.departure_airport || {}) as Record<string, unknown>;
      const arr = (last.arrival_airport || {}) as Record<string, unknown>;
      return {
        id: `flight_${index}_${airline}_${price ?? "na"}`,
        title: `${airline} ${departure} → ${arrival}`,
        airline,
        price: Number.isFinite(price as number) ? Number(price) : null,
        currency: String(args.currency || "EUR"),
        stops: Math.max(0, flights.length - 1),
        durationMinutes:
          typeof item.total_duration === "number" ? item.total_duration : null,
        link: typeof item.booking_token === "string" ? null : typeof item.departure_token === "string" ? null : null,
        departure: typeof dep.time === "string" ? dep.time : null,
        arrival: typeof arr.time === "string" ? arr.time : null,
        raw: item,
      };
    });

    // Prefer Google Flights URL from search metadata when present
    const googleUrl =
      typeof (json.search_metadata as Record<string, unknown> | undefined)?.google_flights_url ===
      "string"
        ? String((json.search_metadata as Record<string, unknown>).google_flights_url)
        : `https://www.google.com/travel/flights`;

    return {
      offers: offers.map((o) => ({ ...o, link: o.link || googleUrl })),
      fetchedAt,
    };
  } catch (e) {
    return {
      offers: [],
      fetchedAt,
      error: e instanceof Error ? e.message : "Flights provider failed",
    };
  }
}

export async function fetchGoogleHotels(args: {
  query: string;
  checkInDate?: string;
  checkOutDate?: string;
  nights?: number;
  currency?: string;
  gl?: string;
  signal?: AbortSignal;
}): Promise<{ offers: SerpHotelOffer[]; fetchedAt: string; error?: string }> {
  const key = apiKey();
  const fetchedAt = new Date().toISOString();
  if (!key) return { offers: [], fetchedAt, error: "SERPAPI_KEY missing" };

  const checkIn =
    args.checkInDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const nights = args.nights && args.nights > 0 ? args.nights : 3;
  const checkOut =
    args.checkOutDate ||
    new Date(new Date(checkIn).getTime() + nights * 86400000).toISOString().slice(0, 10);

  const params = new URLSearchParams({
    engine: "google_hotels",
    api_key: key,
    q: args.query,
    check_in_date: checkIn,
    check_out_date: checkOut,
    currency: args.currency || "EUR",
    hl: "en",
    gl: (args.gl || "nl").toLowerCase(),
  });

  try {
    const res = await fetch(`https://serpapi.com/search.json?${params}`, {
      signal: args.signal,
    });
    if (!res.ok) return { offers: [], fetchedAt, error: `SerpAPI hotels HTTP ${res.status}` };
    const json = (await res.json()) as Record<string, unknown>;
    if (json.error) return { offers: [], fetchedAt, error: String(json.error) };

    const properties = Array.isArray(json.properties) ? json.properties : [];
    const offers: SerpHotelOffer[] = properties.slice(0, 12).map((row, index) => {
      const item = row as Record<string, unknown>;
      const rate = (item.rate_per_night || item.total_rate || {}) as Record<string, unknown>;
      const priceRaw = rate.extracted_lowest ?? rate.lowest ?? item.price;
      const price =
        typeof priceRaw === "number"
          ? priceRaw
          : typeof priceRaw === "string"
            ? Number(String(priceRaw).replace(/[^\d.]/g, ""))
            : null;
      return {
        id: `hotel_${index}_${String(item.name || "property").slice(0, 24)}`,
        title: String(item.name || "Hotel"),
        price: Number.isFinite(price as number) ? Number(price) : null,
        currency: String(args.currency || "EUR"),
        rating: typeof item.overall_rating === "number" ? item.overall_rating : null,
        link: typeof item.link === "string" ? item.link : null,
        neighborhood:
          typeof item.nearby_places === "string"
            ? item.nearby_places
            : typeof item.description === "string"
              ? item.description.slice(0, 80)
              : null,
        raw: item,
      };
    });

    return { offers, fetchedAt };
  } catch (e) {
    return {
      offers: [],
      fetchedAt,
      error: e instanceof Error ? e.message : "Hotels provider failed",
    };
  }
}

/** Subscription pricing signals via Google search (real snippets only). */
export async function fetchSubscriptionSignals(args: {
  query: string;
  gl?: string;
  signal?: AbortSignal;
}): Promise<{
  title: string;
  snippets: string[];
  link: string | null;
  fetchedAt: string;
  error?: string;
}> {
  const key = apiKey();
  const fetchedAt = new Date().toISOString();
  if (!key) {
    return { title: args.query, snippets: [], link: null, fetchedAt, error: "SERPAPI_KEY missing" };
  }

  const params = new URLSearchParams({
    engine: "google",
    api_key: key,
    q: `${args.query} price plan cancel`,
    hl: "en",
    gl: (args.gl || "nl").toLowerCase(),
    num: "8",
  });

  try {
    const res = await fetch(`https://serpapi.com/search.json?${params}`, {
      signal: args.signal,
    });
    if (!res.ok) {
      return {
        title: args.query,
        snippets: [],
        link: null,
        fetchedAt,
        error: `SerpAPI google HTTP ${res.status}`,
      };
    }
    const json = (await res.json()) as Record<string, unknown>;
    const organic = Array.isArray(json.organic_results) ? json.organic_results : [];
    const snippets = organic
      .slice(0, 6)
      .map((row) => {
        const item = row as Record<string, unknown>;
        return [item.title, item.snippet].filter(Boolean).join(" — ");
      })
      .filter(Boolean) as string[];
    const first = (organic[0] || {}) as Record<string, unknown>;
    return {
      title: String(first.title || args.query),
      snippets,
      link: typeof first.link === "string" ? first.link : null,
      fetchedAt,
    };
  } catch (e) {
    return {
      title: args.query,
      snippets: [],
      link: null,
      fetchedAt,
      error: e instanceof Error ? e.message : "Subscription provider failed",
    };
  }
}
