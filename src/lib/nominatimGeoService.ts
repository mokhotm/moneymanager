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

export function cleanMerchantSearchQuery(rawQuery: string): { query: string; isExplicitCountry: boolean } {
  if (!rawQuery) return { query: "", isExplicitCountry: false };
  let clean = rawQuery
    // Remove bank prefix noise
    .replace(/^(pos|c\*|s2s\*|debit|purchase|eft|card|txn)\s*[-*:]?\s*/i, "")
    // Remove trailing card/terminal/auth digits like "1234", "*9876"
    .replace(/(\*|\b)\d{3,6}(\b|$)/g, "")
    // Remove duplicate repetitive tokens like "SPRI SPRIN"
    .replace(/\b([a-z]+)\s+\1\b/gi, "$1")
    .replace(/\s+/g, " ")
    .trim();

  const internationalRegex = /\b(united\s*states|usa|uk|united\s*kingdom|england|london|dubai|uae|australia|germany|france|botswana|gaborone|namibia|windhoek|lesotho|maseru|zimbabwe|harare|kenya|nairobi|canada|singapore|mauritius|japan|china)\b/i;
  const isExplicitCountry = internationalRegex.test(clean) || /south\s*africa|rsa/i.test(clean);

  // If no explicit country is found, default to South Africa for domestic statements
  if (!isExplicitCountry) {
    clean = `${clean}, South Africa`;
  }

  return { query: clean, isExplicitCountry: internationalRegex.test(clean) };
}

/**
 * Searches OpenStreetMap Nominatim globally (with smart South Africa prioritization).
 */
export async function searchNominatimAddress(query: string, limit = 5): Promise<GeocodedAddress[]> {
  try {
    const { query: cleaned, isExplicitCountry } = cleanMerchantSearchQuery(query);
    if (!cleaned) return [];

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", cleaned);
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    if (!isExplicitCountry) {
      url.searchParams.set("countrycodes", "za"); // Prioritize South Africa unless an international country is requested
    }
    url.searchParams.set("limit", String(limit));

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "MoneyManager-GlobalRadar/2.5 (contact@moneymanager.local)",
        "Accept-Language": "en",
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
