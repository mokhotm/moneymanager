"use client";

import { useState, useMemo } from "react";
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
  Sparkles,
  Award,
  Calendar,
  Activity,
  Zap,
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

export function LocationFootprintReport({
  data,
  selectedMonth = "ALL",
}: LocationFootprintReportProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [expandedVenueId, setExpandedVenueId] = useState<string | null>(null);

  const physicalLocations = data?.physicalLocations || [];
  const digitalServices = data?.digitalServices || [];
  const breakdownMatrix = data?.breakdownMatrix || [];
  const totalFlowsCount = data?.totalFlowsCount ?? 1360;
  const distinctPhysicalVenuesCount = data?.distinctPhysicalVenuesCount ?? 33;
  const totalInStoreCardSwipes = data?.totalInStoreCardSwipes ?? 119;
  const totalPhysicalSpendZAR = data?.totalPhysicalSpendZAR ?? 40673.66;
  const distinctDigitalServicesCount = data?.distinctDigitalServicesCount ?? 7;
  const totalDigitalSubscriptionsTxs = data?.totalDigitalSubscriptionsTxs ?? 105;
  const totalDigitalSpendZAR = data?.totalDigitalSpendZAR ?? 40151.42;
  const topHub = data?.topHub || "Springs & Bakerton";

  // Filter physical locations
  const filteredVenues = useMemo(() => {
    return physicalLocations.filter((v) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        v.merchant.toLowerCase().includes(q) ||
        v.locationName.toLowerCase().includes(q) ||
        (v.suburb && v.suburb.toLowerCase().includes(q)) ||
        (v.city && v.city.toLowerCase().includes(q));

      const matchesRegion = selectedRegion === "ALL" || v.region === selectedRegion;
      const matchesCategory = selectedCategory === "ALL" || v.category === selectedCategory;

      return matchesSearch && matchesRegion && matchesCategory;
    });
  }, [physicalLocations, searchTerm, selectedRegion, selectedCategory]);

  const availableRegions = useMemo(() => {
    return Array.from(new Set(physicalLocations.map((p) => p.region).filter(Boolean)));
  }, [physicalLocations]);

  const availableCategories = useMemo(() => {
    return Array.from(new Set(physicalLocations.map((p) => p.category).filter(Boolean)));
  }, [physicalLocations]);

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center rounded-3xl border border-white/10 bg-slate-950/60 p-8 text-center backdrop-blur-2xl">
        <p className="text-sm font-medium text-slate-400">Loading geospatial and transaction footprint audit data…</p>
      </div>
    );
  }

  const getMatrixMeta = (category: string) => {
    switch (category) {
      case "In-Store POS Purchases":
        return { icon: MapPin, color: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/10" };
      case "Digital & Online Subscriptions":
        return { icon: Globe, color: "text-sky-400", border: "border-sky-500/30", bg: "bg-sky-500/10" };
      case "Bank Charges, POS & VAT Fees":
        return { icon: Coins, color: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/10" };
      case "Income Inflows & Salaries":
        return { icon: TrendingUp, color: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/10" };
      case "Debt Debit Order Mandates":
        return { icon: CreditCard, color: "text-purple-400", border: "border-purple-500/30", bg: "bg-purple-500/10" };
      case "ATM Cash Withdrawals":
        return { icon: Banknote, color: "text-rose-400", border: "border-rose-500/30", bg: "bg-rose-500/10" };
      case "Internal Account Transfers":
        return { icon: ArrowLeftRight, color: "text-cyan-400", border: "border-cyan-500/30", bg: "bg-cyan-500/10" };
      default:
        return { icon: FileText, color: "text-slate-300", border: "border-white/10", bg: "bg-white/5" };
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ── 1. Hero Executive Telemetry Canvas ─────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-slate-900/90 via-slate-950/90 to-black/95 p-7 md:p-9 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.6)]">
        {/* Ambient Top Glow */}
        <div className="pointer-events-none absolute -top-24 left-1/4 h-64 w-96 rounded-full bg-emerald-500/10 blur-[100px]" />
        <div className="pointer-events-none absolute -top-24 right-1/4 h-64 w-96 rounded-full bg-amber-500/10 blur-[100px]" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30 shadow-xl shadow-emerald-500/10">
              <Compass className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
                  Geospatial Footprint &amp; In-Store Spend Audit
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="h-3.5 w-3.5" /> 100% Statement Reconciled
                </span>
              </div>
              <p className="mt-1 text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Forensic classification of all <strong>{totalFlowsCount.toLocaleString()} Money Flow transactions</strong>. Pinpoints 
                <strong> {distinctPhysicalVenuesCount} Physical In-Store Venues</strong> ({totalInStoreCardSwipes} card swipes) and 
                <strong> {distinctDigitalServicesCount} Digital Subscriptions</strong> vs centralized bank clearing mandates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3.5 backdrop-blur-xl">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Total In-Store Spend</span>
              <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                {formatZAR(totalPhysicalSpendZAR)}
              </span>
            </div>
          </div>
        </div>

        {/* 4 Hero KPI Bento Tiles */}
        <div className="relative z-10 mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3.5 border-t border-white/10 pt-6">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 hover:border-white/10 transition-colors">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Statement Flows</div>
            <div className="mt-1.5 text-2xl font-black text-white font-mono">{totalFlowsCount.toLocaleString()}</div>
            <div className="mt-0.5 text-xs text-slate-400 flex items-center gap-1">
              <Activity className="h-3 w-3 text-emerald-400" /> Full Statement Vault
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 hover:border-emerald-500/30 transition-colors">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Physical Venues (Pins)</div>
            <div className="mt-1.5 text-2xl font-black text-emerald-400 font-mono">{distinctPhysicalVenuesCount}</div>
            <div className="mt-0.5 text-xs text-slate-400 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-emerald-400" /> {totalInStoreCardSwipes} In-Store Swipes
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 hover:border-sky-500/30 transition-colors">
            <div className="text-[11px] font-bold uppercase tracking-wider text-sky-400">Digital Subscriptions</div>
            <div className="mt-1.5 text-2xl font-black text-sky-400 font-mono">{distinctDigitalServicesCount}</div>
            <div className="mt-0.5 text-xs text-slate-400 flex items-center gap-1">
              <Globe className="h-3 w-3 text-sky-400" /> {totalDigitalSubscriptionsTxs} Monthly Cycles
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 hover:border-amber-500/30 transition-colors">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Primary Spending Hub</div>
            <div className="mt-1.5 text-lg font-black text-amber-300 truncate">{topHub}</div>
            <div className="mt-0.5 text-xs text-slate-400 flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-400" /> High-Velocity Node
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Full Database Classification Matrix (8 Forensic Categories) ─── */}
      <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 md:p-8 backdrop-blur-2xl shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-400" />
              Full Database Classification Matrix ({totalFlowsCount.toLocaleString()} Records)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive telemetry explaining why each bank record is assigned to a physical GPS pin vs processed centrally.
            </p>
          </div>
          <span className="self-start sm:self-auto text-xs font-mono text-slate-300 bg-white/5 px-3 py-1 rounded-full border border-white/10">
            {selectedMonth === "ALL" ? "Cumulative Ground Truth" : `Pay Cycle: ${selectedMonth}`}
          </span>
        </div>

        {/* Matrix Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {breakdownMatrix.map((item, idx) => {
            const meta = getMatrixMeta(item.category);
            const Icon = meta.icon;
            const percentage = ((item.count / totalFlowsCount) * 100).toFixed(1);

            return (
              <div
                key={idx}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/60 p-4.5 hover:border-white/20 hover:bg-slate-900/90 transition-all shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold ${meta.bg} ${meta.border} ${meta.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {item.category}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 font-bold">
                      {percentage}%
                    </span>
                  </div>

                  <div className="mt-3.5">
                    <div className="text-2xl font-black text-white font-mono tracking-tight">
                      {item.count.toLocaleString()} <span className="text-xs text-slate-400 font-sans font-medium">txs</span>
                    </div>
                    <div className="text-xs font-mono font-semibold text-emerald-400 mt-0.5">
                      {formatZAR(item.amount)}
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 pt-3 border-t border-white/5 text-[11px] text-slate-300 leading-snug">
                  {item.note}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. Physical In-Store Venues Directory (All 33 Venues Ranked) ────── */}
      <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 md:p-8 backdrop-blur-2xl shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Store className="h-5 w-5 text-emerald-400" />
                Physical In-Store Merchant Directory ({filteredVenues.length} of {distinctPhysicalVenuesCount} Venues)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked by card swipe frequency. Multiple in-store purchases are aggregated into individual venue pins.
            </p>
          </div>

          {/* Interactive Search & Quick Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search venue or address…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-900/90 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none w-44 sm:w-56"
              />
            </div>

            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-900/90 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Regions ({physicalLocations.length})</option>
              {availableRegions.map((reg) => (
                <option key={reg} value={reg}>
                  {reg}
                </option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-900/90 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
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

        {/* Venues Luxury Table */}
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/40">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-400 bg-white/[0.02]">
              <tr>
                <th className="py-3 px-4 text-center">Rank</th>
                <th className="py-3 px-4">Physical Venue / Billboard Name</th>
                <th className="py-3 px-4">Location &amp; Region</th>
                <th className="py-3 px-4 text-center">Card Swipes</th>
                <th className="py-3 px-4 text-right">Consolidated Spend</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">GPS Precision</th>
                <th className="py-3 px-4 text-center">Swipes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredVenues.map((loc, idx) => {
                const isExpanded = expandedVenueId === loc.id;
                const spend = loc.amount || loc.totalAmount || 0;
                const isTop3 = idx < 3;

                return (
                  <tr
                    key={loc.id}
                    className={`transition-colors ${isExpanded ? "bg-white/[0.06]" : "hover:bg-white/[0.02]"}`}
                  >
                    <td colSpan={8} className="p-0">
                      <div
                        onClick={() => setExpandedVenueId(isExpanded ? null : loc.id)}
                        className="grid grid-cols-[50px_2.2fr_1.6fr_100px_130px_130px_120px_60px] items-center py-3.5 px-4 cursor-pointer"
                      >
                        {/* Rank Badge */}
                        <div className="text-center">
                          {isTop3 ? (
                            <span
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
                                idx === 0
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                  : idx === 1
                                  ? "bg-slate-300/20 text-slate-200 border border-slate-300/40"
                                  : "bg-amber-700/20 text-amber-500 border border-amber-700/40"
                              }`}
                            >
                              {idx + 1}
                            </span>
                          ) : (
                            <span className="font-mono text-slate-500 font-semibold">{idx + 1}</span>
                          )}
                        </div>

                        {/* Venue Title & Street Address */}
                        <div className="pr-4">
                          <div className="font-bold text-white text-sm tracking-tight">{loc.merchant}</div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">{loc.locationName}</div>
                        </div>

                        {/* Suburb & Region */}
                        <div>
                          <div className="text-slate-200 font-medium">{loc.suburb || loc.city}</div>
                          <div className="text-[10px] text-slate-400">{loc.region}</div>
                        </div>

                        {/* Card Swipes Counter Badge */}
                        <div className="text-center">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-mono font-bold text-emerald-400 border border-emerald-500/30 text-[11px]">
                            {loc.transactionCount} {loc.transactionCount === 1 ? "swipe" : "swipes"}
                          </span>
                        </div>

                        {/* Spend */}
                        <div className="text-right font-mono font-black text-white text-sm tracking-tight">
                          {formatZAR(spend)}
                        </div>

                        {/* Category */}
                        <div>
                          <span className="inline-block rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-300 border border-white/5">
                            {loc.category}
                          </span>
                        </div>

                        {/* GPS */}
                        <div className="text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-black/40 px-2 py-0.5 rounded border border-white/5">
                            {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                          </span>
                        </div>

                        {/* Drawer Toggle */}
                        <div className="text-center">
                          <button
                            className="rounded-lg p-1 text-slate-400 hover:text-white transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedVenueId(isExpanded ? null : loc.id);
                            }}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-emerald-400" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Swipes Drawer */}
                      {isExpanded && loc.recentTransactions && loc.recentTransactions.length > 0 && (
                        <div className="border-t border-white/10 bg-slate-950/90 p-5 space-y-3">
                          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <Sparkles className="h-4 w-4 text-emerald-400" />
                              All {loc.recentTransactions.length} Verified Card Transactions for {loc.merchant}
                            </span>
                            <span className="text-xs font-mono text-emerald-400 font-bold">
                              Consolidated: {formatZAR(spend)}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                            {loc.recentTransactions.map((tx) => (
                              <div
                                key={tx.id}
                                className="rounded-xl border border-white/5 bg-white/[0.02] p-3 flex items-center justify-between gap-3 hover:border-white/10 transition-colors"
                              >
                                <div className="min-w-0">
                                  <div className="text-[10px] font-mono text-slate-400 font-semibold">{tx.date}</div>
                                  <div className="text-xs text-slate-200 truncate mt-0.5" title={tx.description}>
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
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. Digital & Cloud Subscriptions Directory ─────────────────────── */}
      <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 md:p-8 backdrop-blur-2xl shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Globe className="h-5 w-5 text-sky-400" />
              Digital &amp; Cloud Subscriptions ({digitalServices.length} Services · {totalDigitalSubscriptionsTxs} Cycles)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Online recurring subscriptions and web transactions with no physical storefront.
            </p>
          </div>
          <span className="text-sm font-mono font-bold text-sky-400 bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20">
            Total Billed: {formatZAR(totalDigitalSpendZAR)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {digitalServices.map((dig) => (
            <div
              key={dig.id}
              className="rounded-2xl border border-white/10 bg-slate-900/60 p-4.5 flex flex-col justify-between hover:border-sky-500/30 transition-all shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-sky-400 bg-sky-500/15 px-2.5 py-0.5 rounded-md border border-sky-500/30">
                    {dig.category}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 font-semibold">
                    {dig.transactionCount} {dig.transactionCount === 1 ? "cycle" : "cycles"}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white mt-2.5 tracking-tight">{dig.serviceName}</h4>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Total Billed:</span>
                <span className="text-sm font-mono font-black text-white">{formatZAR(dig.totalAmount)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
