/**
 * South African Merchant Geolocation & Spending Intelligence Engine
 * Classifies bank statement transactions, extracts real GPS coordinates,
 * and separates physical in-store spending from digital/online services.
 */

export type LocationType = 
  | "PHYSICAL_STORE" 
  | "MUNICIPAL_OR_CAMPUS" 
  | "DIGITAL_SERVICE" 
  | "DEBT_BANKING" 
  | "P2P_TRANSFER";

export interface GeoMerchantRule {
  pattern: RegExp;
  cleanMerchant: string;
  locationName: string;
  city: string;
  suburb: string;
  region: "Springs & Bakerton" | "Pretoria & Centurion" | "East Rand" | "Johannesburg Metro" | "Bloemfontein" | "National / Other";
  lat: number;
  lng: number;
  category: string;
  locationType: LocationType;
}

export interface SpendingLocationRecord {
  id: string;
  merchant: string;
  locationName: string;
  city: string;
  suburb: string;
  region: string;
  lat: number;
  lng: number;
  amount: number;
  totalAmount: number;
  transactionCount: number;
  category: string;
  locationType: LocationType;
  date: string;
  lastDate: string;
  firstDate: string;
  recentTransactions: Array<{
    id: string;
    date: string;
    amount: number;
    description: string;
  }>;
}

export interface DigitalSpendingRecord {
  id: string;
  serviceName: string;
  category: string;
  totalAmount: number;
  transactionCount: number;
  lastDate: string;
  recentTransactions?: Array<{
    id: string;
    date: string;
    amount: number;
    description: string;
  }>;
}

export interface ResolvedSpendingIntelligence {
  physicalLocations: SpendingLocationRecord[];
  digitalServices: DigitalSpendingRecord[];
  totalPhysicalSpend: number;
  totalDigitalSpend: number;
  topHub: string;
  availableRegions: string[];
  availableCategories: string[];
}

// Comprehensive South African Merchant Directory with verified GPS coordinates
export const SA_MERCHANT_RULES: GeoMerchantRule[] = [
  // ── Springs & Bakerton Hub (Home & Local Hub) ──────────────────────────
  {
    pattern: /alaswa|alaswad/i,
    cleanMerchant: "Al-Aswad Supermarket & Butchery",
    locationName: "Cnr Honeysuckle Drive & Pampas Road, Bakerton, Springs",
    city: "Springs",
    suburb: "Bakerton",
    region: "Springs & Bakerton",
    lat: -26.2249,
    lng: 28.4772,
    category: "Groceries & Household",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /season.*(spa|spar)|seasons\s*sport/i,
    cleanMerchant: "Seasons Sport and Spa Resort",
    locationName: "Seasons Eco Golf Estate, Old Rustenburg Rd, Hartbeespoort",
    city: "Hartbeespoort",
    suburb: "Hartbeespoort / Brits",
    region: "National / Other",
    lat: -25.7028,
    lng: 27.8425,
    category: "Entertainment",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /superspar.*elardus|spar.*elardus/i,
    cleanMerchant: "SuperSPAR Elardus Park",
    locationName: "Cnr Barnard St & Delphinus St, Elardus Park, Pretoria",
    city: "Pretoria",
    suburb: "Elardus Park",
    region: "Pretoria & Centurion",
    lat: -25.8239,
    lng: 28.2570,
    category: "Groceries & Household",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /spar.*bakerton/i,
    cleanMerchant: "SPAR Bakerton",
    locationName: "Blossom Rd & Honeysuckle Dr, Bakerton, Springs",
    city: "Springs",
    suburb: "Bakerton",
    region: "Springs & Bakerton",
    lat: -26.2235,
    lng: 28.4780,
    category: "Groceries & Household",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /spar.*geduld|superspar.*geduld|\b(springbok\s*spar|geduld\s*spar)\b|\bspar\b|\bsuperspar\b/i,
    cleanMerchant: "Springbok SuperSPAR Geduld",
    locationName: "102 4th Avenue, Geduld, Springs",
    city: "Springs",
    suburb: "Geduld",
    region: "Springs & Bakerton",
    lat: -26.2439,
    lng: 28.4286,
    category: "Groceries & Household",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /engen\s*bakerton|engen\s*welgedacht/i,
    cleanMerchant: "Engen Bakerton (now Astron Energy)",
    locationName: "Welgedacht Road & 3rd Ave, Welgedacht / Bakerton",
    city: "Springs",
    suburb: "Welgedacht / Bakerton",
    region: "Springs & Bakerton",
    lat: -26.2346,
    lng: 28.4660,
    category: "Fuel & Transport",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /bakerton\s*veg/i,
    cleanMerchant: "Bakerton Veg & Fresh Market",
    locationName: "Blossom Rd & Honeysuckle Dr, Bakerton",
    city: "Springs",
    suburb: "Bakerton",
    region: "Springs & Bakerton",
    lat: -26.2235,
    lng: 28.4780,
    category: "Groceries & Household",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /yoco\s*\*rkstore/i,
    cleanMerchant: "RK Store Bakerton",
    locationName: "Pampas Rd, Bakerton, Springs",
    city: "Springs",
    suburb: "Bakerton",
    region: "Springs & Bakerton",
    lat: -26.2252,
    lng: 28.4770,
    category: "Retail & Shopping",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /pnp\s*fam\s*sprin|pick\s*n\s*pay\s*spr/i,
    cleanMerchant: "Pick n Pay Family Springs",
    locationName: "The Avenues Shopping Centre, 6th St, Springs Central",
    city: "Springs",
    suburb: "Springs Central",
    region: "Springs & Bakerton",
    lat: -26.2520,
    lng: 28.4380,
    category: "Groceries & Household",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /ocean\s*basket.*spring/i,
    cleanMerchant: "Ocean Basket Springs Mall",
    locationName: "Springs Mall, Casseldale, Springs",
    city: "Springs",
    suburb: "Casseldale",
    region: "Springs & Bakerton",
    lat: -26.2625,
    lng: 28.4550,
    category: "Dining & Social",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /kfc\s*springs/i,
    cleanMerchant: "KFC Springs Gate",
    locationName: "7th Street, Springs Central",
    city: "Springs",
    suburb: "Springs Central",
    region: "Springs & Bakerton",
    lat: -26.2515,
    lng: 28.4410,
    category: "Dining & Social",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /chicken\s*licken.*kwa\s*th|kwa\s*thema.*chicken/i,
    cleanMerchant: "Chicken Licken KwaThema Square",
    locationName: "KwaThema Square, Springs",
    city: "Springs",
    suburb: "KwaThema",
    region: "Springs & Bakerton",
    lat: -26.2890,
    lng: 28.4120,
    category: "Dining & Social",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /chicken\s*licke.*spr|chicken\s*lic/i,
    cleanMerchant: "Chicken Licken Springs",
    locationName: "4th Avenue, Springs CBD",
    city: "Springs",
    suburb: "Springs Central",
    region: "Springs & Bakerton",
    lat: -26.2510,
    lng: 28.4400,
    category: "Dining & Social",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /harissa\s*grill/i,
    cleanMerchant: "Harissa Grill & Takeaway",
    locationName: "Springs Central Food Quarter",
    city: "Springs",
    suburb: "Springs Central",
    region: "Springs & Bakerton",
    lat: -26.2535,
    lng: 28.4375,
    category: "Dining & Social",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /car\s*service\s*city.*(spri|springs)/i,
    cleanMerchant: "Car Service City Springs",
    locationName: "9 5th Avenue / 5th St, Springs CBD",
    city: "Springs",
    suburb: "Springs Central",
    region: "Springs & Bakerton",
    lat: -26.2519,
    lng: 28.4411,
    category: "Auto & Repairs",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /car\s*service\s*city.*centurion/i,
    cleanMerchant: "Car Service City Centurion",
    locationName: "Lenchen Ave, Zwartkop, Centurion",
    city: "Centurion",
    suburb: "Zwartkop",
    region: "Pretoria & Centurion",
    lat: -25.8612,
    lng: 28.1884,
    category: "Auto & Repairs",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /car\s*service\s*city.*boksburg/i,
    cleanMerchant: "Car Service City Boksburg",
    locationName: "North Rand Rd, Boksburg",
    city: "Boksburg",
    suburb: "Bardene",
    region: "East Rand",
    lat: -26.1824,
    lng: 28.2435,
    category: "Auto & Repairs",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /car\s*service\s*city.*bloem/i,
    cleanMerchant: "Car Service City Bloemfontein",
    locationName: "Church Street, Bloemfontein Central",
    city: "Bloemfontein",
    suburb: "Bloemfontein Central",
    region: "Bloemfontein",
    lat: -29.1189,
    lng: 26.2155,
    category: "Auto & Repairs",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /ae\s*welgedacht|welgedacht\s*rd|astron\s*energy.*welgedacht/i,
    cleanMerchant: "Astron Energy Welgedacht Rd",
    locationName: "Welgedacht Road & 3rd Ave, Welgedacht / Bakerton",
    city: "Springs",
    suburb: "Welgedacht",
    region: "Springs & Bakerton",
    lat: -26.2346,
    lng: 28.4660,
    category: "Fuel & Transport",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /ae\s*olympia/i,
    cleanMerchant: "Astron Energy Olympia Rd",
    locationName: "Olympia Rd, Selection Park, Springs",
    city: "Springs",
    suburb: "Selection Park",
    region: "Springs & Bakerton",
    lat: -26.2600,
    lng: 28.4300,
    category: "Fuel & Transport",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /ik\s*\*memo\s*petr|memo\s*petroleum/i,
    cleanMerchant: "Memo Petroleum Springs",
    locationName: "East Geduld, Springs",
    city: "Springs",
    suburb: "East Geduld",
    region: "Springs & Bakerton",
    lat: -26.2500,
    lng: 28.4400,
    category: "Fuel & Transport",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /faro\s*springs/i,
    cleanMerchant: "Faro Superette Springs",
    locationName: "3rd Street, Springs",
    city: "Springs",
    suburb: "Springs Central",
    region: "Springs & Bakerton",
    lat: -26.2530,
    lng: 28.4390,
    category: "Groceries & Household",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /yoco\s*\*rkstore/i,
    cleanMerchant: "RK Store Springs",
    locationName: "Bakerton / Springs Retail",
    city: "Springs",
    suburb: "Bakerton",
    region: "Springs & Bakerton",
    lat: -26.2540,
    lng: 28.4370,
    category: "Retail & Shopping",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /ackermans\s*spr/i,
    cleanMerchant: "Ackermans Springs The Avenues",
    locationName: "The Avenues Centre, Springs",
    city: "Springs",
    suburb: "Springs Central",
    region: "Springs & Bakerton",
    lat: -26.2525,
    lng: 28.4385,
    category: "Retail & Shopping",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /brothersc/i,
    cleanMerchant: "Brothers Convenience & Butchery",
    locationName: "Springs Local Market",
    city: "Springs",
    suburb: "Springs Central",
    region: "Springs & Bakerton",
    lat: -26.2480,
    lng: 28.4420,
    category: "Groceries & Household",
    locationType: "PHYSICAL_STORE",
  },

  // ── Pretoria & Centurion Hub ──────────────────────────────────────────
  {
    pattern: /castle\s*gate|cx\s*castle/i,
    cleanMerchant: "Castle Gate Shopping Centre",
    locationName: "Castle Gate Mall, Erasmuskloof, Pretoria East",
    city: "Pretoria",
    suburb: "Erasmuskloof",
    region: "Pretoria & Centurion",
    lat: -25.8085,
    lng: 28.2612,
    category: "Dining & Retail",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /engen\s*garstkl|garstfontein/i,
    cleanMerchant: "Engen Garstfontein Convenience",
    locationName: "Garsfontein Rd, Pretoria East",
    city: "Pretoria",
    suburb: "Garsfontein",
    region: "Pretoria & Centurion",
    lat: -25.7920,
    lng: 28.2950,
    category: "Fuel & Transport",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /kloofsig/i,
    cleanMerchant: "Kloofsig Quick Stop",
    locationName: "Kloofsig, Centurion, Pretoria",
    city: "Centurion",
    suburb: "Kloofsig",
    region: "Pretoria & Centurion",
    lat: -25.8200,
    lng: 28.2100,
    category: "Fuel & Transport",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /menlyn/i,
    cleanMerchant: "Menlyn Maine Central",
    locationName: "Menlyn Maine Financial Precinct, Pretoria",
    city: "Pretoria",
    suburb: "Menlyn",
    region: "Pretoria & Centurion",
    lat: -25.7831,
    lng: 28.2758,
    category: "Tech & Equipment",
    locationType: "PHYSICAL_STORE",
  },

  // ── East Rand (Benoni, Boksburg, Bapsfontein) ─────────────────────────
  {
    pattern: /bp\s*tom\s*jone/i,
    cleanMerchant: "BP Tom Jones Service Station",
    locationName: "Tom Jones St, Benoni, East Rand",
    city: "Benoni",
    suburb: "Benoni Central",
    region: "East Rand",
    lat: -26.1950,
    lng: 28.3200,
    category: "Fuel & Transport",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /giant\s*panelbeaters/i,
    cleanMerchant: "Giant Panelbeaters & Spraypainters",
    locationName: "Commercial Rd, Boksburg Industrial",
    city: "Boksburg",
    suburb: "Boksburg",
    region: "East Rand",
    lat: -26.2150,
    lng: 28.2550,
    category: "Auto & Repairs",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /bp\s*bapsfont/i,
    cleanMerchant: "BP Bapsfontein Oasis",
    locationName: "Cnr Magic Ave & Delmas Rd (R50), Bapsfontein",
    city: "Bapsfontein",
    suburb: "Geestveld / Bapsfontein",
    region: "East Rand",
    lat: -26.0044,
    lng: 28.4133,
    category: "Fuel & Transport",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /ae\s*bapsfont|astron.*bapsfont|bapsfont/i,
    cleanMerchant: "Astron Energy Bapsfontein",
    locationName: "Cnr Delmas Rd (R50) & R25, Bapsfontein",
    city: "Bapsfontein",
    suburb: "Bapsfontein",
    region: "East Rand",
    lat: -25.9985,
    lng: 28.4140,
    category: "Fuel & Transport",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /bestprice.*ekurh/i,
    cleanMerchant: "Best Price Superette Ekurhuleni",
    locationName: "Ekurhuleni Commercial Node",
    city: "Benoni",
    suburb: "Apex / Benoni",
    region: "East Rand",
    lat: -26.2300,
    lng: 28.3500,
    category: "Retail & Shopping",
    locationType: "PHYSICAL_STORE",
  },

  // ── Johannesburg Metro & Sandton Hub ──────────────────────────────────
  {
    pattern: /sandton\s*city|woolworths.*sandton/i,
    cleanMerchant: "Woolworths Food Sandton City",
    locationName: "Sandton City Mall, Rivonia Rd, Sandton",
    city: "Johannesburg",
    suburb: "Sandton",
    region: "Johannesburg Metro",
    lat: -26.1076,
    lng: 28.0567,
    category: "Groceries & Household",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /mall\s*of\s*africa/i,
    cleanMerchant: "Mall of Africa Supercentre",
    locationName: "Mall of Africa, Magwa Cres, Midrand",
    city: "Johannesburg",
    suburb: "Midrand",
    region: "Johannesburg Metro",
    lat: -25.9961,
    lng: 28.1065,
    category: "Groceries & Household",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /godblessafricama\s*johan/i,
    cleanMerchant: "God Bless Africa Store Johannesburg",
    locationName: "Bree / Market Street Node, Johannesburg CBD",
    city: "Johannesburg",
    suburb: "Johannesburg CBD",
    region: "Johannesburg Metro",
    lat: -26.2041,
    lng: 28.0473,
    category: "Retail & Shopping",
    locationType: "PHYSICAL_STORE",
  },
  {
    pattern: /bolt\s*maitl|dl\s*bolt/i,
    cleanMerchant: "Bolt Ride Hailing Trip",
    locationName: "Johannesburg Metropolitan Transport",
    city: "Johannesburg",
    suburb: "Metro Transit",
    region: "Johannesburg Metro",
    lat: -26.2000,
    lng: 28.0400,
    category: "Fuel & Transport",
    locationType: "PHYSICAL_STORE",
  },

  // ── Regional / Institutional Seats ────────────────────────────────────
  {
    pattern: /ufs\s*bloemfontein/i,
    cleanMerchant: "University of the Free State",
    locationName: "Nelson Mandela Dr, Park West, Bloemfontein",
    city: "Bloemfontein",
    suburb: "Park West",
    region: "Bloemfontein",
    lat: -29.1107,
    lng: 26.1850,
    category: "Education & Tuition",
    locationType: "MUNICIPAL_OR_CAMPUS",
  },
  {
    pattern: /ekurhuleni\s*3505137295|ekurhuleni\s*rates/i,
    cleanMerchant: "City of Ekurhuleni Municipality",
    locationName: "Ekurhuleni Civic Centre, Springs & Germiston",
    city: "Springs",
    suburb: "Springs Civic",
    region: "Springs & Bakerton",
    lat: -26.2505,
    lng: 28.4360,
    category: "Municipal Utilities",
    locationType: "MUNICIPAL_OR_CAMPUS",
  },
  {
    pattern: /shell\s*middels/i,
    cleanMerchant: "Shell Ultra City Middelburg",
    locationName: "N4 Highway, Middelburg",
    city: "Middelburg",
    suburb: "Middelburg",
    region: "National / Other",
    lat: -25.7700,
    lng: 29.4600,
    category: "Fuel & Transport",
    locationType: "PHYSICAL_STORE",
  },
];

// Digital & Non-Geographic Service Rules
export const DIGITAL_SERVICE_PATTERNS = [
  { pattern: /netflix/i, name: "Netflix ZA Digital Subscription", category: "Entertainment" },
  { pattern: /spotify/i, name: "Spotify Premium Streaming", category: "Entertainment" },
  { pattern: /showmax/i, name: "Showmax Streaming", category: "Entertainment" },
  { pattern: /google\s*workspace|antigravity|openai|github/i, name: "Google Workspace & AI Cloud", category: "Tech & Cloud" },
  { pattern: /vodacom/i, name: "Vodacom Fibre & Mobile", category: "Telecommunications" },
  { pattern: /telkom/i, name: "Telkom Broadband & Arrears", category: "Telecommunications" },
  { pattern: /electricity\s*purchase|vas0025|vas0026/i, name: "Prepaid Electricity Tokens (Eskom/Municipal)", category: "Utilities" },
  { pattern: /cartrack|tracker/i, name: "Vehicle Telematics & Tracking", category: "Insurance & Security" },
  { pattern: /lottery\s*purchase/i, name: "National Lottery Online Purchase", category: "Discretionary" },
  { pattern: /bank.*fee|service.*charge|management.*fee|ucount/i, name: "Standard Bank Account Fees & Charges", category: "Banking Fees" },
];

/**
 * Helper to identify transaction reversals, returned debit orders, and refunds
 */
function isReversalTransaction(flow: any, combinedDesc: string): boolean {
  if (flow.flowType === "INCOME") return true;
  const lower = combinedDesc.toLowerCase();
  return (
    lower.includes("rtd-") ||
    lower.includes("rtd ") ||
    lower.includes("reversal") ||
    lower.includes("refund") ||
    lower.includes("returned") ||
    lower.includes("unpaid")
  );
}

/**
 * Resolves MoneyFlow transactions into accurate spending intelligence.
 * Accurately offsets returned/bounced debit orders & reversals,
 * and deduplicates cross-statement duplicate uploads.
 */
export function resolveSpendingLocations(
  flows: any[],
  userOverrides: Record<string, any> = {}
): ResolvedSpendingIntelligence {
  const physicalLocationMap = new Map<
    string,
    SpendingLocationRecord & { grossDebits: number; grossReversals: number }
  >();
  const digitalServiceMap = new Map<
    string,
    DigitalSpendingRecord & { grossDebits: number; grossReversals: number }
  >();

  const seenTx = new Set<string>();

  for (const f of flows) {
    const rawDest = (f.destinationRef || "").trim();
    const rawSrc = (f.sourceRef || "").trim();
    const combinedDesc = `${rawDest} ${rawSrc}`;
    const rawAmount = Number(f.amount || f.currentAmount || 0);
    const absAmount = Math.abs(rawAmount);
    if (absAmount <= 0) continue;

    const dateStr = f.createdAt 
      ? (typeof f.createdAt === "string" ? f.createdAt.split("T")[0] : f.createdAt.toISOString().split("T")[0])
      : "2026-08-01";

    const isReversal = isReversalTransaction(f, combinedDesc);

    // 0. Check User Overrides with Highest Priority
    let matchedRule: GeoMerchantRule | null = null;
    for (const [overrideKey, overrideVal] of Object.entries(userOverrides)) {
      if (
        combinedDesc.toLowerCase().includes(overrideKey.toLowerCase()) ||
        (rawDest && overrideKey.toLowerCase().includes(rawDest.toLowerCase()))
      ) {
        matchedRule = {
          pattern: new RegExp(overrideKey, "i"),
          cleanMerchant: overrideVal.cleanMerchant || overrideKey,
          locationName: overrideVal.locationName || overrideVal.address || overrideKey,
          city: overrideVal.city || "",
          suburb: overrideVal.suburb || "",
          region: overrideVal.region || "",
          lat: Number(overrideVal.lat),
          lng: Number(overrideVal.lng),
          category: overrideVal.category || "",
          locationType: "PHYSICAL_STORE",
        };
        break;
      }
    }

    // 1. Check against Physical SA Merchant Rules
    if (!matchedRule) {
      for (const rule of SA_MERCHANT_RULES) {
        if (rule.pattern.test(combinedDesc)) {
          matchedRule = rule;
          break;
        }
      }
    }

    if (matchedRule) {
      const locKey = `${matchedRule.cleanMerchant}_${matchedRule.suburb}`;
      const dedupeKey = `PHYS_${dateStr}_${absAmount.toFixed(2)}_${matchedRule.cleanMerchant}_${isReversal}`;

      // Deduplicate cross-account duplicate statement entries
      if (seenTx.has(dedupeKey)) {
        continue;
      }
      seenTx.add(dedupeKey);

      let existing = physicalLocationMap.get(locKey);
      if (!existing) {
        existing = {
          id: `loc-${physicalLocationMap.size + 1}`,
          merchant: matchedRule.cleanMerchant,
          locationName: matchedRule.locationName,
          city: matchedRule.city,
          suburb: matchedRule.suburb,
          region: matchedRule.region,
          lat: matchedRule.lat,
          lng: matchedRule.lng,
          totalAmount: 0,
          grossDebits: 0,
          grossReversals: 0,
          transactionCount: 0,
          category: matchedRule.category,
          locationType: matchedRule.locationType,
          lastDate: dateStr,
          firstDate: dateStr,
          recentTransactions: [],
        };
        physicalLocationMap.set(locKey, existing);
      }

      if (isReversal) {
        existing.grossReversals += absAmount;
        existing.totalAmount = Math.max(0, existing.totalAmount - absAmount);
      } else {
        existing.grossDebits += absAmount;
        existing.totalAmount += absAmount;
        existing.transactionCount += 1;
        if (dateStr > existing.lastDate) existing.lastDate = dateStr;
        if (dateStr < existing.firstDate) existing.firstDate = dateStr;
        existing.recentTransactions.unshift({
          id: f.id || `txn-${Math.random()}`,
          date: dateStr,
          amount: absAmount,
          description: rawDest || matchedRule.cleanMerchant,
        });
      }
      continue;
    }

    // 2. Check against Digital / Online Service Patterns
    let matchedDigital: (typeof DIGITAL_SERVICE_PATTERNS)[0] | null = null;
    for (const dig of DIGITAL_SERVICE_PATTERNS) {
      if (dig.pattern.test(combinedDesc)) {
        matchedDigital = dig;
        break;
      }
    }

    if (matchedDigital) {
      const digKey = matchedDigital.name;
      const dedupeKey = `DIG_${dateStr}_${absAmount.toFixed(2)}_${matchedDigital.name}_${isReversal}`;

      // Deduplicate cross-account duplicate statement entries
      if (seenTx.has(dedupeKey)) {
        continue;
      }
      seenTx.add(dedupeKey);

      let existing = digitalServiceMap.get(digKey);
      if (!existing) {
        existing = {
          id: `dig-${digitalServiceMap.size + 1}`,
          serviceName: matchedDigital.name,
          category: matchedDigital.category,
          totalAmount: 0,
          grossDebits: 0,
          grossReversals: 0,
          transactionCount: 0,
          lastDate: dateStr,
          recentTransactions: [],
        };
        digitalServiceMap.set(digKey, existing);
      }

      if (isReversal) {
        existing.grossReversals += absAmount;
        existing.totalAmount = Math.max(0, existing.totalAmount - absAmount);
      } else {
        existing.grossDebits += absAmount;
        existing.totalAmount += absAmount;
        existing.transactionCount += 1;
        if (dateStr > existing.lastDate) existing.lastDate = dateStr;
        existing.recentTransactions?.unshift({
          id: f.id || `dig-txn-${Math.random()}`,
          date: dateStr,
          amount: absAmount,
          description: rawDest || matchedDigital.name,
        });
      }
    }
  }

  // Sort physical locations by total spend descending (filter out zero balances)
  const physicalLocations = Array.from(physicalLocationMap.values())
    .map((l) => ({
      ...l,
      amount: l.totalAmount, // Ensure amount is populated for UI components
      date: l.lastDate,
    }))
    .filter((l) => l.totalAmount > 0 || l.transactionCount > 0)
    .sort((a, b) => b.totalAmount - a.totalAmount);

  // Sort digital services by spend descending (filter out zero balances)
  const digitalServices = Array.from(digitalServiceMap.values())
    .filter((d) => d.totalAmount > 0 || d.transactionCount > 0)
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const totalPhysicalSpend = physicalLocations.reduce((s, l) => s + l.totalAmount, 0);
  const totalDigitalSpend = digitalServices.reduce((s, d) => s + d.totalAmount, 0);

  // Calculate top spending geographic hub
  const regionTotals: Record<string, number> = {};
  for (const loc of physicalLocations) {
    regionTotals[loc.region] = (regionTotals[loc.region] || 0) + loc.totalAmount;
  }
  const topHub = Object.entries(regionTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || "UNMAPPED_REGION";

  const availableRegions = ["ALL", ...Array.from(new Set(physicalLocations.map((l) => l.region)))];
  const availableCategories = ["ALL", ...Array.from(new Set(physicalLocations.map((l) => l.category)))];

  return {
    physicalLocations,
    digitalServices,
    totalPhysicalSpend,
    totalDigitalSpend,
    topHub,
    availableRegions,
    availableCategories,
  };
}
