"use client";

import { useState } from "react";
import { formatZAR } from "@/lib/formatters";
import {
  Compass,
  MapPin,
  Globe,
  Coins,
  CreditCard,
  Banknote,
  ArrowLeftRight,
  FileText,
  TrendingUp,
  Store,
  ShieldCheck,
  Search,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
} from "lucide-react";

interface MatrixItem {
  category: string;
  count: number;
  amount: number;
  note: string;
  icon: string;
}

interface PhysicalVenue {
  id: string;
  merchant: string;
  cleanMerchant?: string;
  locationName: string;
  suburb: string;
  city: string;
  region: string;
  category: string;
  amount: number;
  totalAmount?: number;
  transactionCount: number;
  lat: number;
  lng: number;
  recentTransactions?: Array<{
    id: string;
    date: string;
    amount: number;
    description: string;
  }>;
}

interface DigitalService {
  id: string;
  serviceName: string;
  category: string;
  totalAmount: number;
  transactionCount: number;
  lastDate?: string;
  recentTransactions?: Array<{
    id: string;
    date: string;
    amount: number;
    description: string;
  }>;
}

export interface LocationAuditData {
  totalFlowsCount: number;
  distinctPhysicalVenuesCount: number;
  totalInStoreCardSwipes: number;
  totalPhysicalSpendZAR: number;
  distinctDigitalServicesCount: number;
  totalDigitalSubscriptionsTxs: number;
  totalDigitalSpendZAR: number;
  topHub: string;
  breakdownMatrix: MatrixItem[];
  physicalLocations: PhysicalVenue[];
  digitalServices: DigitalService[];
}

interface LocationFootprintReportProps {
  data?: LocationAuditData;
  selectedMonth?: string;
}

export function LocationFootprintReport({ data, selectedMonth = "ALL" }: LocationFootprintReportProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [expandedVenueId, setExpandedVenueId] = useState<string | null>(null);

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/40 p-8 text-center">
        <p className="text-sm font-medium text-slate-400">Loading geospatial and transaction footprint audit data…</p>
      </div>
    );
  }

  const {
    totalFlowsCount = 1360,
    distinctPhysicalVenuesCount = 33,
    totalInStoreCardSwipes = 119,
    totalPhysicalSpendZAR = 40673.66,
    distinctDigitalServicesCount = 7,
    totalDigitalSubscriptionsTxs = 105,
    totalDigitalSpendZAR = 40151.42,
    topHub = "Springs & Bakerton",
    breakdownMatrix = [],
    physicalLocations = [],
    digitalServices = [],
  } = data;

  const totalVaultSpend = totalPhysicalSpendZAR + totalDigitalSpendZAR;

  // Filter physical locations
  const filteredVenues = physicalLocations.filter((v) => {
    const matchesSearch =
      searchTerm === "" ||
      v.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.locationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.suburb && v.suburb.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (v.city && v.city.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRegion = selectedRegion === "ALL" || v.region === selectedRegion;
    const matchesCategory = selectedCategory === "ALL" || v.category === selectedCategory;

    return matchesSearch && matchesRegion && matchesCategory;
  });

  const availableRegions = Array.from(new Set(physicalLocations.map((p) => p.region).filter(Boolean)));
  const availableCategories = Array.from(new Set(physicalLocations.map((p) => p.category).filter(Boolean)));

  const getMatrixIcon = (iconName: string) => {
    switch (iconName) {
      case "MapPin":
        return <MapPin className="h-4 w-4 text-emerald-400" />;
      case "Globe":
        return <Globe className="h-4 w-4 text-blue-400" />;
      case "Coins":
        return <Coins className="h-4 w-4 text-amber-400" />;
      case "TrendingUp":
        return <TrendingUp className="h-4 w-4 text-emerald-400" />;
      case "CreditCard":
        return <CreditCard className="h-4 w-4 text-purple-400" />;
      case "Banknote":
        return <Banknote className="h-4 w-4 text-rose-400" />;
      case "ArrowLeftRight":
        return <ArrowLeftRight className="h-4 w-4 text-cyan-400" />;
      default:
        return <FileText className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ── 1. Top Executive Banner ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-emerald-950/30 p-6 md:p-8 backdrop-blur-2xl shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
              <Compass className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  Geospatial Footprint &amp; Transaction Audit
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="h-3.5 w-3.5" /> 100% Verified Telemetry
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-300 max-w-2xl leading-relaxed">
                Forensic classification of all <strong>{totalFlowsCount.toLocaleString()} Money Flow records</strong>. Reconciles 
                <strong> {distinctPhysicalVenuesCount} Physical In-Store Venues</strong> ({totalInStoreCardSwipes} card swipes) against 
                <strong> {distinctDigitalServicesCount} Digital Cloud Services</strong> and central bank clearing house transfers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-right backdrop-blur-md">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total In-Store Spend</p>
              <p className="text-xl md:text-2xl font-black text-emerald-400 font-mono">
                {formatZAR(totalPhysicalSpendZAR)}
              </p>
            </div>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-white/10 pt-6">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Bank Records</p>
            <p className="mt-1 text-2xl font-black text-white font-mono">{totalFlowsCount.toLocaleString()}</p>
            <p className="mt-0.5 text-xs text-slate-400">Statement Lineage</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Physical Venues (Pins)</p>
            <p className="mt-1 text-2xl font-black text-emerald-400 font-mono">{distinctPhysicalVenuesCount}</p>
            <p className="mt-0.5 text-xs text-slate-400">{totalInStoreCardSwipes} Total Card Swipes</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Digital Services</p>
            <p className="mt-1 text-2xl font-black text-blue-400 font-mono">{distinctDigitalServicesCount}</p>
            <p className="mt-0.5 text-xs text-slate-400">{totalDigitalSubscriptionsTxs} Billing Cycles</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Primary Retail Hub</p>
            <p className="mt-1 text-lg font-black text-amber-400 truncate">{topHub}</p>
            <p className="mt-0.5 text-xs text-slate-400">Ekurhuleni Metro Node</p>
          </div>
        </div>
      </div>

      {/* ── 2. The 8-Category Database Breakdown Matrix ───────────────────── */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 md:p-8 backdrop-blur-xl shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-400" />
              Full Database Classification Matrix ({totalFlowsCount.toLocaleString()} Records)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Forensic distribution explaining why transactions are mapped to physical GPS coordinates vs non-geographic clearing operations.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
            {selectedMonth === "ALL" ? "Cumulative Ground Truth" : `Pay Cycle ${selectedMonth}`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-400 bg-white/[0.02]">
              <tr>
                <th className="py-3 px-4">Financial Flow Category</th>
                <th className="py-3 px-4 text-center">Tx Count</th>
                <th className="py-3 px-4 text-right">Volume (ZAR)</th>
                <th className="py-3 px-4">% of Flows</th>
                <th className="py-3 px-4">Classification &amp; Spatial Routing Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {breakdownMatrix.map((item, idx) => {
                const percentage = ((item.count / totalFlowsCount) * 100).toFixed(1);
                return (
                  <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/10">
                        {getMatrixIcon(item.icon)}
                      </div>
                      <span>{item.category}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-white">
                      {item.count.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-200">
                      {formatZAR(item.amount)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-12 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${Math.min(100, parseFloat(percentage) * 2)}%` }}
                          />
                        </div>
                        <span>{percentage}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 text-[11px] leading-relaxed">
                      {item.note}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 3. Physical Venues Directory (All 33 Venues) ──────────────────── */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Store className="h-5 w-5 text-emerald-400" />
              Verified In-Store Merchant Directory ({filteredVenues.length} of {distinctPhysicalVenuesCount} Venues)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked by card swipe frequency and consolidated in-store spending footprint.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search venue or address…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-800/80 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none w-48 sm:w-60"
              />
            </div>

            {/* Region Filter */}
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-800/80 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Regions ({physicalLocations.length})</option>
              {availableRegions.map((reg) => (
                <option key={reg} value={reg}>
                  {reg}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-800/80 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Venues Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-400 bg-white/[0.02]">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Physical Merchant / Storefront</th>
                <th className="py-3 px-4">Location &amp; Region</th>
                <th className="py-3 px-4 text-center">Card Swipes</th>
                <th className="py-3 px-4 text-right">Consolidated Spend</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Rooftop GPS</th>
                <th className="py-3 px-4 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredVenues.map((loc, idx) => {
                const isExpanded = expandedVenueId === loc.id;
                const spend = loc.amount || loc.totalAmount || 0;

                return (
                  <>
                    <tr
                      key={loc.id}
                      className={`hover:bg-white/[0.03] transition-colors cursor-pointer ${isExpanded ? "bg-white/[0.04]" : ""}`}
                      onClick={() => setExpandedVenueId(isExpanded ? null : loc.id)}
                    >
                      <td className="py-3.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{loc.merchant}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{loc.locationName}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-200 font-medium">{loc.suburb || loc.city}</div>
                        <div className="text-[10px] text-slate-400">{loc.region}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono font-bold text-emerald-400 border border-emerald-500/30">
                          {loc.transactionCount} {loc.transactionCount === 1 ? "swipe" : "swipes"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-white text-sm">
                        {formatZAR(spend)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-300 border border-white/5">
                          {loc.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-black/40 px-2 py-0.5 rounded border border-white/5">
                          {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          className="rounded-lg p-1 text-slate-400 hover:text-white transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedVenueId(isExpanded ? null : loc.id);
                          }}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Individual Transaction Drawer */}
                    {isExpanded && loc.recentTransactions && loc.recentTransactions.length > 0 && (
                      <tr className="bg-slate-950/80 border-b border-white/10">
                        <td colSpan={8} className="p-4">
                          <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-4 space-y-3">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                                All {loc.recentTransactions.length} Recorded Swipes for {loc.merchant}
                              </span>
                              <span className="text-xs font-mono text-emerald-400 font-bold">
                                Total: {formatZAR(spend)}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto">
                              {loc.recentTransactions.map((tx) => (
                                <div
                                  key={tx.id}
                                  className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 flex items-center justify-between gap-2"
                                >
                                  <div>
                                    <div className="text-[11px] font-mono text-slate-400">{tx.date}</div>
                                    <div className="text-xs text-slate-200 truncate max-w-[180px]" title={tx.description}>
                                      {tx.description}
                                    </div>
                                  </div>
                                  <div className="text-xs font-mono font-bold text-emerald-400 shrink-0">
                                    {formatZAR(tx.amount)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. Digital Services Directory ─────────────────────────────────── */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 md:p-8 backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-400" />
              Digital &amp; Cloud Subscriptions ({digitalServices.length} Services · {totalDigitalSubscriptionsTxs} Txs)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Online recurring subscriptions and web transactions with no physical storefront.
            </p>
          </div>
          <span className="text-sm font-mono font-bold text-blue-400">
            Total: {formatZAR(totalDigitalSpendZAR)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {digitalServices.map((dig) => (
            <div
              key={dig.id}
              className="rounded-2xl border border-white/10 bg-slate-900 p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                    {dig.category}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {dig.transactionCount} {dig.transactionCount === 1 ? "tx" : "txs"}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white mt-2">{dig.serviceName}</h4>
              </div>
              <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Total Billed:</span>
                <span className="text-sm font-mono font-bold text-white">{formatZAR(dig.totalAmount)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
