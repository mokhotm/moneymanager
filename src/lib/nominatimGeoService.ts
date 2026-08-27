/**
 * OpenStreetMap Nominatim Geocoding Service for South African Merchants
 * Provides rooftop coordinates, structured address breakdown, and live address search.
 */

export interface GeocodedAddress {
  displayName: string;
  road?: string;
  suburb?: string;
  city?: string;
  state?: string;
  postcode?: string;
  lat: number;
  lng: number;
  importance: number;
  osmType?: string;
}

export function cleanMerchantSearchQuery(rawQuery: string): string {
  if (!rawQuery) return "";
  let clean = rawQuery
    // Remove bank prefix noise
    .replace(/^(pos|c\*|s2s\*|debit|purchase|eft|card|txn)\s*[-*:]?\s*/i, "")
    // Remove trailing card/terminal/auth digits like "1234", "*9876"
    .replace(/(\*|\b)\d{3,6}(\b|$)/g, "")
    // Remove duplicate repetitive tokens like "SPRI SPRIN"
    .replace(/\b([a-z]+)\s+\1\b/gi, "$1")
    .replace(/\s+/g, " ")
    .trim();

  // If South Africa is not mentioned, append it for geographic context
  if (!/south\s*africa|rsa|gauteng|pretoria|johannesburg|springs|cape\s*town|durban|bloemfontein/i.test(clean)) {
    clean = `${clean}, South Africa`;
  } else if (!/south\s*africa|rsa/i.test(clean)) {
    clean = `${clean}, South Africa`;
  }

  return clean;
}

/**
 * Searches OpenStreetMap Nominatim for South African places and addresses.
 */
export async function searchNominatimAddress(query: string, limit = 5): Promise<GeocodedAddress[]> {
  try {
    const cleaned = cleanMerchantSearchQuery(query);
    if (!cleaned) return [];

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", cleaned);
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("countrycodes", "za"); // Strict South Africa restriction
    url.searchParams.set("limit", String(limit));

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "MoneyManager-SARadar/2.5 (contact@moneymanager.local)",
        "Accept-Language": "en-ZA,en",
      },
    });

    if (!response.ok) {
      console.warn(`Nominatim geocoding failed with status ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => {
      const addr = item.address || {};
      const suburb =
        addr.suburb ||
        addr.neighbourhood ||
        addr.residential ||
        addr.commercial ||
        addr.industrial ||
        addr.village ||
        addr.town ||
        "";

      const city =
        addr.city ||
        addr.town ||
        addr.municipality ||
        addr.county ||
        addr.state_district ||
        "Springs";

      const state = addr.state || "Gauteng";

      return {
        displayName: item.display_name,
        road: addr.road || addr.pedestrian || addr.street,
        suburb,
        city,
        state,
        postcode: addr.postcode,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        importance: item.importance || 0.5,
        osmType: item.osm_type,
      };
    });
  } catch (error) {
    console.error("Error during Nominatim geocoding:", error);
    return [];
  }
}
