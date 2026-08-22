import { describe, it, expect } from "vitest";
import { resolveSpendingLocations } from "../src/lib/geoResolver";

describe("South African Geo & Spending Intelligence Engine", () => {
  it("correctly identifies and geocodes physical South African merchants", () => {
    const mockFlows = [
      {
        id: "flow-1",
        destinationRef: "SPAR BAKERTON DEBIT CARD PURCHASE",
        amount: 1450,
        createdAt: new Date("2026-08-16T14:15:00Z"),
      },
      {
        id: "flow-2",
        destinationRef: "ENGEN BAKERTON CONVENIENCE DEBIT CARD PURCHASE",
        amount: 900,
        createdAt: new Date("2026-08-16T16:30:00Z"),
      },
      {
        id: "flow-3",
        destinationRef: "NETFLIX ZA SUBSCRIPTION",
        amount: 199,
        createdAt: new Date("2026-08-01T00:00:00Z"),
      },
      {
        id: "flow-4",
        destinationRef: "VAS00254364585 ELECTRICITY PURCHASE",
        amount: 500,
        createdAt: new Date("2026-08-02T10:00:00Z"),
      },
    ];

    const result = resolveSpendingLocations(mockFlows);

    // Verify physical in-store locations
    expect(result.physicalLocations.length).toBe(2);
    const spar = result.physicalLocations.find((l) => l.merchant === "Springbok SuperSPAR Geduld");
    expect(spar).toBeDefined();
    expect(spar?.city).toBe("Springs");
    expect(spar?.suburb).toBe("Geduld");
    expect(spar?.region).toBe("Springs & Bakerton");
    expect(spar?.lat).toBeCloseTo(-26.2439, 3);
    expect(spar?.lng).toBeCloseTo(28.4286, 3);
    expect(spar?.totalAmount).toBe(1450);

    // Verify digital services are cleanly separated
    expect(result.digitalServices.length).toBe(2);
    const netflix = result.digitalServices.find((d) => d.serviceName.includes("Netflix"));
    expect(netflix).toBeDefined();
    expect(netflix?.totalAmount).toBe(199);

    const electricity = result.digitalServices.find((d) => d.serviceName.includes("Electricity"));
    expect(electricity).toBeDefined();
    expect(electricity?.totalAmount).toBe(500);

    // Verify totals and top hub
    expect(result.totalPhysicalSpend).toBe(2350);
    expect(result.totalDigitalSpend).toBe(699);
    expect(result.topHub).toBe("Springs & Bakerton");
  });

  it("applies custom user merchant location overrides with top priority", () => {
    const mockFlows = [
      {
        id: "flow-100",
        destinationRef: "CUSTOM BAKERY TEST SPRINGS",
        amount: 320,
        createdAt: new Date("2026-08-18T10:00:00Z"),
      },
    ];

    const customOverrides = {
      "CUSTOM BAKERY TEST": {
        cleanMerchant: "Custom Gourmet Bakery",
        locationName: "15 3rd Street, Springs Central",
        suburb: "Springs Central",
        city: "Springs",
        region: "Springs & Bakerton",
        lat: -26.2510,
        lng: 28.4375,
        category: "Dining & Treats",
      },
    };

    const result = resolveSpendingLocations(mockFlows, customOverrides);
    expect(result.physicalLocations.length).toBe(1);
    const loc = result.physicalLocations[0];
    expect(loc.merchant).toBe("Custom Gourmet Bakery");
    expect(loc.locationName).toBe("15 3rd Street, Springs Central");
    expect(loc.lat).toBe(-26.2510);
    expect(loc.lng).toBe(28.4375);
    expect(loc.totalAmount).toBe(320);
  });

  it("handles empty or zero-amount flows gracefully", () => {
    const result = resolveSpendingLocations([]);
    expect(result.physicalLocations).toEqual([]);
    expect(result.digitalServices).toEqual([]);
    expect(result.totalPhysicalSpend).toBe(0);
    expect(result.totalDigitalSpend).toBe(0);
  });
});
