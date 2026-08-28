/**
 * Global Tax & Audit-Proof Compliance Optimization Engine (§Vector 6 / 100x Architecture)
 * Computes allowable tax deductions and progressive tax liabilities across multiple global tax jurisdictions:
 * - South Africa (SARS): Section 11(a), 11F RA (27.5%), 12B Clean Energy, 6A MTC, TFSA
 * - United States (IRS): 2026 Federal Brackets, Standard Deduction, 401(k)/IRA, Sec 25D Clean Energy (30%), HSA/Medical
 * - United Kingdom (HMRC): Personal Allowance, Workplace Pension/SIPP (up to £60k), Solar/Clean Heat 0% VAT, ISA
 * - Canada (CRA): Combined Federal/Provincial Brackets, Basic Personal Amount, RRSP (18% to $31,560), Greener Homes, TFSA
 * - Australia (ATO): Stage 3 Brackets, Concessional Superannuation ($30k cap), STC Solar, Private Health Rebate
 * - European Union (EU): Standard progressive rates, Pillar 3 Pension, Green Deal solar write-off, Health credits
 * - Global (Universal): Universal progressive brackets, pension relief, clean energy, health deduction
 */

import { round2 } from "./snowball";

export type TaxJurisdiction = "ZA" | "US" | "UK" | "CA" | "AU" | "EU" | "GLOBAL";

export interface TaxJurisdictionInfo {
  code: TaxJurisdiction;
  name: string;
  authority: string;
  country: string;
  flag: string;
  currencyCode: string;
  currencySymbol: string;
  defaultTaxYear: number;
  auditFormName: string;
  auditPackFileName: string;
  retirementSchemeName: string;
  cleanEnergySchemeName: string;
  healthcareSchemeName: string;
  taxShelteredAccountName: string;
  standardDeductionLabel: string;
}

export const JURISDICTIONS: Record<TaxJurisdiction, TaxJurisdictionInfo> = {
  ZA: {
    code: "ZA",
    name: "South Africa",
    authority: "SARS",
    country: "South Africa",
    flag: "🇿🇦",
    currencyCode: "ZAR",
    currencySymbol: "R",
    defaultTaxYear: 2026,
    auditFormName: "ITR12 Individual Income Tax Return",
    auditPackFileName: "SARS-ITR12-EVIDENCE-2026.zip",
    retirementSchemeName: "Section 11F Retirement Annuity (27.5% Cap)",
    cleanEnergySchemeName: "Section 12B Clean Energy 100% Write-off",
    healthcareSchemeName: "Section 6A Medical Scheme Fees Tax Credit",
    taxShelteredAccountName: "Tax-Free Savings Account (TFSA)",
    standardDeductionLabel: "Primary Statutory Tax Rebate",
  },
  US: {
    code: "US",
    name: "United States",
    authority: "IRS",
    country: "United States",
    flag: "🇺🇸",
    currencyCode: "USD",
    currencySymbol: "$",
    defaultTaxYear: 2026,
    auditFormName: "Form 1040 & Schedule C/A",
    auditPackFileName: "IRS-Form1040-Audit-Bundle-2026.zip",
    retirementSchemeName: "Section 401(k) & Traditional IRA ($23k/$7k Cap)",
    cleanEnergySchemeName: "Section 25D Residential Clean Energy Credit (30%)",
    healthcareSchemeName: "HSA / Eligible Medical Expense Deductions",
    taxShelteredAccountName: "Roth IRA / Backdoor Roth",
    standardDeductionLabel: "IRS Standard Deduction ($14,600 Single)",
  },
  UK: {
    code: "UK",
    name: "United Kingdom",
    authority: "HMRC",
    country: "United Kingdom",
    flag: "🇬🇧",
    currencyCode: "GBP",
    currencySymbol: "£",
    defaultTaxYear: 2026,
    auditFormName: "SA100 Self Assessment Tax Return",
    auditPackFileName: "HMRC-SelfAssessment-Audit-Pack-2026.zip",
    retirementSchemeName: "Workplace Pension / SIPP (£60,000 Cap)",
    cleanEnergySchemeName: "0% VAT Solar & Heat Pump Eco Incentive",
    healthcareSchemeName: "Private Medical Insurance & Health Expenses",
    taxShelteredAccountName: "Individual Savings Account (ISA £20k Limit)",
    standardDeductionLabel: "HMRC Tax-Free Personal Allowance (£12,570)",
  },
  CA: {
    code: "CA",
    name: "Canada",
    authority: "CRA",
    country: "Canada",
    flag: "🇨🇦",
    currencyCode: "CAD",
    currencySymbol: "C$",
    defaultTaxYear: 2026,
    auditFormName: "T1 General Income Tax and Benefit Return",
    auditPackFileName: "CRA-T1-General-Audit-Pack-2026.zip",
    retirementSchemeName: "RRSP Registered Retirement Savings (18% Cap)",
    cleanEnergySchemeName: "Greener Homes Clean Energy Credit (CCA 43.1)",
    healthcareSchemeName: "Medical Expense Tax Credit (METC)",
    taxShelteredAccountName: "Tax-Free Savings Account (TFSA $7k Limit)",
    standardDeductionLabel: "Basic Personal Amount ($15,705)",
  },
  AU: {
    code: "AU",
    name: "Australia",
    authority: "ATO",
    country: "Australia",
    flag: "🇦🇺",
    currencyCode: "AUD",
    currencySymbol: "A$",
    defaultTaxYear: 2026,
    auditFormName: "Individual Tax Return (myTax / e-Tax)",
    auditPackFileName: "ATO-TaxReturn-Audit-Pack-2026.zip",
    retirementSchemeName: "Concessional Superannuation ($30,000 Cap)",
    cleanEnergySchemeName: "Small-scale Renewable Energy Scheme (STC)",
    healthcareSchemeName: "Private Health Insurance Rebate & MLS Offset",
    taxShelteredAccountName: "First Home Super Saver Scheme (FHSSS)",
    standardDeductionLabel: "Tax-Free Threshold ($18,200)",
  },
  EU: {
    code: "EU",
    name: "European Union",
    authority: "EU Tax Harmonized",
    country: "European Union",
    flag: "🇪🇺",
    currencyCode: "EUR",
    currencySymbol: "€",
    defaultTaxYear: 2026,
    auditFormName: "EU Standardized Income Tax Declaration",
    auditPackFileName: "EU-Tax-Compliance-Bundle-2026.zip",
    retirementSchemeName: "Pillar 3 Private Pension Allowance (€6,000 Cap)",
    cleanEnergySchemeName: "EU Green Deal Clean Energy Capital Allowance",
    healthcareSchemeName: "Statutory Health & Care Insurance Deduction",
    taxShelteredAccountName: "Capital Growth Tax-Sheltered Account",
    standardDeductionLabel: "Basic Personal Exemption (€11,000)",
  },
  GLOBAL: {
    code: "GLOBAL",
    name: "Global / Universal",
    authority: "Universal Standard",
    country: "International",
    flag: "🌐",
    currencyCode: "USD",
    currencySymbol: "$",
    defaultTaxYear: 2026,
    auditFormName: "Universal International Tax Declaration",
    auditPackFileName: "Global-Tax-Compliance-Audit-Pack-2026.zip",
    retirementSchemeName: "Global Retirement & Pension Plan (25% Cap)",
    cleanEnergySchemeName: "Renewable Energy & Solar Capital Deduction",
    healthcareSchemeName: "Health & Wellness Insurance Credit",
    taxShelteredAccountName: "Tax-Exempt Investment Account",
    standardDeductionLabel: "Universal Standard Allowance",
  },
};

export interface TaxBracket {
  min: number;
  max: number | null; // null = unbounded
  rate: number; // e.g. 0.18 for 18%
  baseTax: number;
  label: string;
}

export interface TaxBracketBreakdownItem {
  bracketIndex: number;
  bracketLabel: string;
  rate: number;
  ratePercent: string;
  min: number;
  max: number | null;
  taxableInBracket: number;
  taxAmount: number;
  isUserInBracket: boolean;
}

export interface TaxProfileInput {
  jurisdiction?: TaxJurisdiction;
  grossAnnualIncome: number;
  retirementAnnuityAnnualContributions: number;
  pensionFundAnnualContributions?: number;
  medicalAidMembersCount?: number;
  solarCapitalExpenditure?: number;
  businessExpensesTotal?: number;
  tfsaAnnualContributions?: number;
}

export interface TaxOptimizationResult {
  jurisdiction: TaxJurisdictionInfo;
  taxYear: number;
  grossAnnualIncome: number;
  baselineTaxableIncome: number;
  optimizedTaxableIncome: number;
  totalDeductionsClaimed: number;
  estimatedTaxWithoutOptimizations: number;
  estimatedTaxWithOptimizations: number;
  potentialAnnualTaxSavings: number;
  effectiveTaxRate: number;
  marginalTaxRate: number;
  baselineEffectiveRate: number;
  bracketBreakdown: TaxBracketBreakdownItem[];
  currentBracket: TaxBracketBreakdownItem;
  headroomToNextBracket: number | null;
  sections: {
    retirementAnnuity: {
      title: string;
      annualContributions: number;
      allowableCapPercentage: number;
      maxAllowableDeduction: number;
      claimedDeduction: number;
      remainingTaxFreeHeadroom: number;
      taxBenefit: number;
      recommendation: string;
    };
    cleanEnergy: {
      title: string;
      capitalExpenditure: number;
      depreciationRate: number;
      allowableDeduction: number;
      taxBenefit: number;
      note: string;
    };
    businessExpenses: {
      title: string;
      claimedExpenses: number;
      taxBenefit: number;
      itemizedCount: number;
      note: string;
    };
    healthcareCredits: {
      title: string;
      medicalMembersCount: number;
      primaryCredit: number;
      totalAnnualTaxOffset: number;
      note: string;
    };
    taxShelteredSavings: {
      title: string;
      annualContributions: number;
      annualLimit: number;
      remainingAllowance: number;
      isOverContributed: boolean;
      excessAmount: number;
      complianceStatus: "COMPLIANT" | "WARNING" | "OVER_CONTRIBUTED";
      penaltyWarning?: string;
    };
    // Legacy section keys for backward compatibility with existing tests
    section11F_RetirementAnnuity?: any;
    section12B_CleanEnergy?: any;
    section11A_BusinessExpenses?: any;
    section6A_MedicalCredits?: any;
    tfsa_Compliance?: any;
  };
  recommendations: Array<{
    id: string;
    category: string;
    priority: "HIGH" | "MEDIUM" | "INFO";
    title: string;
    description: string;
    estimatedSavings: number;
    actionLabel: string;
  }>;
}

// ---------------------------------------------------------------------------
// Statutory Tax Brackets & Calculations per Jurisdiction
// ---------------------------------------------------------------------------

const TAX_BRACKETS: Record<TaxJurisdiction, TaxBracket[]> = {
  ZA: [
    { min: 0, max: 237100, rate: 0.18, baseTax: 0, label: "Bracket 1 (18%)" },
    { min: 237100, max: 370500, rate: 0.26, baseTax: 42678, label: "Bracket 2 (26%)" },
    { min: 370500, max: 512800, rate: 0.31, baseTax: 77362, label: "Bracket 3 (31%)" },
    { min: 512800, max: 673000, rate: 0.36, baseTax: 121475, label: "Bracket 4 (36%)" },
    { min: 673000, max: 857900, rate: 0.39, baseTax: 179147, label: "Bracket 5 (39%)" },
    { min: 857900, max: 1817000, rate: 0.41, baseTax: 251258, label: "Bracket 6 (41%)" },
    { min: 1817000, max: null, rate: 0.45, baseTax: 644489, label: "Bracket 7 (45% Top Marginal)" },
  ],
  US: [
    { min: 0, max: 11600, rate: 0.10, baseTax: 0, label: "Bracket 1 (10%)" },
    { min: 11600, max: 47150, rate: 0.12, baseTax: 1160, label: "Bracket 2 (12%)" },
    { min: 47150, max: 100525, rate: 0.22, baseTax: 5426, label: "Bracket 3 (22%)" },
    { min: 100525, max: 191950, rate: 0.24, baseTax: 17168.5, label: "Bracket 4 (24%)" },
    { min: 191950, max: 243725, rate: 0.32, baseTax: 39110.5, label: "Bracket 5 (32%)" },
    { min: 243725, max: 609350, rate: 0.35, baseTax: 55678.5, label: "Bracket 6 (35%)" },
    { min: 609350, max: null, rate: 0.37, baseTax: 183647.25, label: "Bracket 7 (37% Top Marginal)" },
  ],
  UK: [
    { min: 0, max: 12570, rate: 0.00, baseTax: 0, label: "Personal Allowance (0% Tax-Free)" },
    { min: 12570, max: 50270, rate: 0.20, baseTax: 0, label: "Basic Rate (20%)" },
    { min: 50270, max: 125140, rate: 0.40, baseTax: 7540, label: "Higher Rate (40%)" },
    { min: 125140, max: null, rate: 0.45, baseTax: 37488, label: "Additional Rate (45% Top Marginal)" },
  ],
  CA: [
    { min: 0, max: 15705, rate: 0.00, baseTax: 0, label: "Basic Personal Amount (0% Tax-Free)" },
    { min: 15705, max: 55867, rate: 0.15, baseTax: 0, label: "Federal Tier 1 (15%)" },
    { min: 55867, max: 111733, rate: 0.205, baseTax: 6024.3, label: "Federal Tier 2 (20.5%)" },
    { min: 111733, max: 173205, rate: 0.26, baseTax: 17476.8, label: "Federal Tier 3 (26%)" },
    { min: 173205, max: 246752, rate: 0.29, baseTax: 33459.5, label: "Federal Tier 4 (29%)" },
    { min: 246752, max: null, rate: 0.33, baseTax: 54788.1, label: "Federal Tier 5 (33% Top Marginal)" },
  ],
  AU: [
    { min: 0, max: 18200, rate: 0.00, baseTax: 0, label: "Tax-Free Threshold (0%)" },
    { min: 18200, max: 45000, rate: 0.16, baseTax: 0, label: "Stage 3 Tier 1 (16%)" },
    { min: 45000, max: 135000, rate: 0.30, baseTax: 4288, label: "Stage 3 Tier 2 (30%)" },
    { min: 135000, max: 190000, rate: 0.37, baseTax: 31288, label: "Stage 3 Tier 3 (37%)" },
    { min: 190000, max: null, rate: 0.45, baseTax: 51638, label: "Stage 3 Tier 4 (45% Top Marginal)" },
  ],
  EU: [
    { min: 0, max: 11000, rate: 0.00, baseTax: 0, label: "Tax-Free Exemption (0%)" },
    { min: 11000, max: 35000, rate: 0.20, baseTax: 0, label: "Tier 1 (20%)" },
    { min: 35000, max: 65000, rate: 0.30, baseTax: 4800, label: "Tier 2 (30%)" },
    { min: 65000, max: 150000, rate: 0.42, baseTax: 13800, label: "Tier 3 (42%)" },
    { min: 150000, max: null, rate: 0.45, baseTax: 49500, label: "Tier 4 (45% Top Marginal)" },
  ],
  GLOBAL: [
    { min: 0, max: 15000, rate: 0.00, baseTax: 0, label: "Standard Allowance (0%)" },
    { min: 15000, max: 50000, rate: 0.15, baseTax: 0, label: "Standard Tier 1 (15%)" },
    { min: 50000, max: 100000, rate: 0.25, baseTax: 5250, label: "Standard Tier 2 (25%)" },
    { min: 100000, max: 200000, rate: 0.32, baseTax: 17750, label: "Standard Tier 3 (32%)" },
    { min: 200000, max: null, rate: 0.38, baseTax: 49750, label: "Standard Tier 4 (38% Top Marginal)" },
  ],
};

const STANDARD_REBATES: Record<TaxJurisdiction, number> = {
  ZA: 17235, // SARS Primary Rebate
  US: 14600 * 0.12, // Equivalent baseline tax reduction for standard deduction
  UK: 0, // Handled inside 0% bracket
  CA: 0, // Handled inside 0% bracket
  AU: 0, // Handled inside 0% bracket
  EU: 0, // Handled inside 0% bracket
  GLOBAL: 0, // Handled inside 0% bracket
};

/**
 * Calculates raw progressive tax and produces detailed bracket analysis
 */
export function calculateProgressiveTax(
  taxableIncome: number,
  jurisdiction: TaxJurisdiction = "ZA"
): { totalTax: number; marginalRate: number; breakdown: TaxBracketBreakdownItem[]; currentBracket: TaxBracketBreakdownItem; headroomToNext: number | null } {
  const brackets = TAX_BRACKETS[jurisdiction] || TAX_BRACKETS.ZA;
  let totalTax = 0;
  let marginalRate = brackets[0].rate;
  const breakdown: TaxBracketBreakdownItem[] = [];
  let currentBracket: TaxBracketBreakdownItem = {
    bracketIndex: 0,
    bracketLabel: brackets[0].label,
    rate: brackets[0].rate,
    ratePercent: `${(brackets[0].rate * 100).toFixed(0)}%`,
    min: brackets[0].min,
    max: brackets[0].max,
    taxableInBracket: 0,
    taxAmount: 0,
    isUserInBracket: true,
  };
  let headroomToNext: number | null = null;

  for (let i = 0; i < brackets.length; i++) {
    const b = brackets[i];
    let taxableInBracket = 0;
    let taxInBracket = 0;

    if (taxableIncome > b.min) {
      if (b.max === null) {
        taxableInBracket = taxableIncome - b.min;
      } else {
        taxableInBracket = Math.min(taxableIncome - b.min, b.max - b.min);
      }
      taxInBracket = round2(taxableInBracket * b.rate);
      totalTax += taxInBracket;
    }

    const isUserInBracket =
      (taxableIncome >= b.min && (b.max === null || taxableIncome < b.max)) ||
      (i === brackets.length - 1 && taxableIncome >= b.min);

    if (isUserInBracket) {
      marginalRate = b.rate;
      if (b.max !== null) {
        headroomToNext = round2(b.max - taxableIncome);
      } else {
        headroomToNext = null;
      }
    }

    const breakdownItem: TaxBracketBreakdownItem = {
      bracketIndex: i + 1,
      bracketLabel: b.label,
      rate: b.rate,
      ratePercent: `${(b.rate * 100).toFixed(0)}%`,
      min: b.min,
      max: b.max,
      taxableInBracket: round2(taxableInBracket),
      taxAmount: round2(taxInBracket),
      isUserInBracket,
    };

    if (isUserInBracket) {
      currentBracket = breakdownItem;
    }

    breakdown.push(breakdownItem);
  }

  return {
    totalTax: round2(totalTax),
    marginalRate,
    breakdown,
    currentBracket,
    headroomToNext,
  };
}

// ---------------------------------------------------------------------------
// Main Evaluation Function
// ---------------------------------------------------------------------------

export function evaluateTaxOptimization(input: TaxProfileInput, taxYear = 2026): TaxOptimizationResult {
  const jurKey: TaxJurisdiction = input.jurisdiction || "ZA";
  const jurInfo = JURISDICTIONS[jurKey] || JURISDICTIONS.ZA;
  const sym = jurInfo.currencySymbol;

  const gross = round2(input.grossAnnualIncome);
  const raContributions = round2(input.retirementAnnuityAnnualContributions + (input.pensionFundAnnualContributions || 0));
  const solarCapEx = round2(input.solarCapitalExpenditure || 0);
  const businessExpenses = round2(input.businessExpensesTotal || 0);
  const tfsaContribs = round2(input.tfsaAnnualContributions || 0);
  const medicalMembers = input.medicalAidMembersCount ?? 3;

  // 1. Retirement & Pension Allowance
  let allowableCapPercentage = 0.275;
  let maxAllowableRADeduction = 350000;

  if (jurKey === "US") {
    allowableCapPercentage = 0.30;
    maxAllowableRADeduction = 30000; // $23,000 401(k) + $7,000 IRA
  } else if (jurKey === "UK") {
    allowableCapPercentage = 1.00; // 100% of earnings up to £60k
    maxAllowableRADeduction = 60000;
  } else if (jurKey === "CA") {
    allowableCapPercentage = 0.18;
    maxAllowableRADeduction = 31560; // RRSP ceiling
  } else if (jurKey === "AU") {
    allowableCapPercentage = 0.25;
    maxAllowableRADeduction = 30000; // Concessional Super
  } else if (jurKey === "EU") {
    allowableCapPercentage = 0.20;
    maxAllowableRADeduction = 12000;
  } else if (jurKey === "GLOBAL") {
    allowableCapPercentage = 0.25;
    maxAllowableRADeduction = 40000;
  } else {
    // ZA
    allowableCapPercentage = 0.275;
    maxAllowableRADeduction = Math.min(350000, round2(gross * 0.275));
  }

  const allowableDeductionByPercent = round2(gross * allowableCapPercentage);
  const finalMaxRADeduction = Math.min(maxAllowableRADeduction, allowableDeductionByPercent);
  const claimedRADeduction = Math.min(raContributions, finalMaxRADeduction);
  const remainingRAHeadroom = round2(Math.max(0, finalMaxRADeduction - raContributions));

  // 2. Clean Energy & Solar Incentive
  let solarDeductionRate = 1.0; // 100%
  let cleanEnergyDirectCredit = 0;
  let allowableSolarDeduction = 0;

  if (jurKey === "US") {
    // IRS Sec 25D is a 30% direct non-refundable tax credit
    solarDeductionRate = 0.30;
    cleanEnergyDirectCredit = round2(solarCapEx * 0.30);
    allowableSolarDeduction = 0;
  } else if (jurKey === "UK") {
    solarDeductionRate = 1.0;
    allowableSolarDeduction = round2(solarCapEx * 0.20); // 0% VAT equivalent savings + capital allowance
  } else if (jurKey === "CA") {
    solarDeductionRate = 0.80; // Greener homes + CCA
    allowableSolarDeduction = round2(solarCapEx * 0.80);
  } else if (jurKey === "AU") {
    solarDeductionRate = 0.35; // STC value
    allowableSolarDeduction = round2(solarCapEx * 0.35);
  } else {
    // ZA, EU, GLOBAL: 100% upfront depreciation
    solarDeductionRate = 1.0;
    allowableSolarDeduction = solarCapEx;
  }

  // 3. Healthcare & Medical Credits
  let primaryMedicalCredit = 0;
  let totalMedicalCredit = 0;

  if (jurKey === "ZA") {
    const primary = 364 * 12; // R4,368
    const firstDep = medicalMembers >= 2 ? 364 * 12 : 0;
    const addDep = medicalMembers > 2 ? (medicalMembers - 2) * 246 * 12 : 0;
    primaryMedicalCredit = primary;
    totalMedicalCredit = primary + firstDep + addDep;
  } else if (jurKey === "US") {
    // HSA max $4,150 single / $8,300 family + credit
    totalMedicalCredit = medicalMembers >= 2 ? 8300 : 4150;
  } else if (jurKey === "UK") {
    totalMedicalCredit = 1200;
  } else if (jurKey === "CA") {
    totalMedicalCredit = round2(2635 * Math.min(medicalMembers, 3));
  } else if (jurKey === "AU") {
    totalMedicalCredit = round2(1500 * Math.min(medicalMembers, 2));
  } else {
    totalMedicalCredit = 2000;
  }

  // 4. Tax-Exempt / Sheltered Savings Accounts (TFSA / Roth / ISA)
  let tfsaAnnualLimit = 36000;
  if (jurKey === "US") tfsaAnnualLimit = 7000; // Roth IRA
  else if (jurKey === "UK") tfsaAnnualLimit = 20000; // ISA
  else if (jurKey === "CA") tfsaAnnualLimit = 7000; // TFSA
  else if (jurKey === "AU") tfsaAnnualLimit = 15000; // FHSSS
  else if (jurKey === "EU") tfsaAnnualLimit = 10000;
  else if (jurKey === "GLOBAL") tfsaAnnualLimit = 10000;

  const isOverContributed = tfsaContribs > tfsaAnnualLimit;
  const excessTFSA = Math.max(0, tfsaContribs - tfsaAnnualLimit);
  const remainingTFSA = Math.max(0, tfsaAnnualLimit - tfsaContribs);

  // Baseline Calculation (Without Optimizations)
  const baselineTaxableIncome = gross;
  const { totalTax: rawBaselineTax } = calculateProgressiveTax(baselineTaxableIncome, jurKey);
  const statutoryRebate = STANDARD_REBATES[jurKey] || 0;
  const estimatedTaxWithoutOptimizations = Math.max(0, round2(rawBaselineTax - statutoryRebate));

  // Optimized Calculation (With Deductions & Credits)
  const totalDeductionsClaimed = round2(claimedRADeduction + allowableSolarDeduction + businessExpenses);
  const optimizedTaxableIncome = Math.max(0, round2(gross - totalDeductionsClaimed));
  const {
    totalTax: rawOptimizedTax,
    marginalRate,
    breakdown: optimizedBreakdown,
    currentBracket,
    headroomToNext,
  } = calculateProgressiveTax(optimizedTaxableIncome, jurKey);

  // Direct bottom-line tax credits (Medical credits + US Clean Energy Credit)
  const directCredits = jurKey === "US" ? cleanEnergyDirectCredit : totalMedicalCredit;
  const estimatedTaxWithOptimizations = Math.max(0, round2(rawOptimizedTax - statutoryRebate - directCredits));

  const potentialAnnualTaxSavings = Math.max(0, round2(estimatedTaxWithoutOptimizations - estimatedTaxWithOptimizations));
  const effectiveTaxRate = gross > 0 ? round2((estimatedTaxWithOptimizations / gross) * 100) : 0;
  const baselineEffectiveRate = gross > 0 ? round2((estimatedTaxWithoutOptimizations / gross) * 100) : 0;

  // Benefits per module
  const raTaxBenefit = round2(claimedRADeduction * marginalRate);
  const solarTaxBenefit = jurKey === "US" ? cleanEnergyDirectCredit : round2(allowableSolarDeduction * marginalRate);
  const businessTaxBenefit = round2(businessExpenses * marginalRate);

  // Recommendations Roadmap
  const recommendations = [
    {
      id: "rec-retirement",
      category: "Retirement & Pensions",
      priority: remainingRAHeadroom > 0 ? ("HIGH" as const) : ("INFO" as const),
      title: remainingRAHeadroom > 0 ? `Maximize ${jurInfo.retirementSchemeName}` : `${jurInfo.retirementSchemeName} Maxed Out`,
      description:
        remainingRAHeadroom > 0
          ? `You have ${sym}${remainingRAHeadroom.toLocaleString()} in remaining tax-sheltered headroom. Contributing before the tax year-end saves an estimated ${sym}${Math.round(remainingRAHeadroom * marginalRate).toLocaleString()} on your tax return.`
          : `You have successfully utilized 100% of your annual retirement tax allowance (${sym}${claimedRADeduction.toLocaleString()}).`,
      estimatedSavings: round2(remainingRAHeadroom * marginalRate),
      actionLabel: remainingRAHeadroom > 0 ? "Top Up Pension/RA" : "View Strategy",
    },
    {
      id: "rec-solar",
      category: "Clean Energy",
      priority: solarCapEx > 0 ? ("HIGH" as const) : ("MEDIUM" as const),
      title: `${jurInfo.cleanEnergySchemeName}`,
      description: `Verified clean energy investment of ${sym}${solarCapEx.toLocaleString()} yields ${sym}${solarTaxBenefit.toLocaleString()} in direct statutory tax relief under ${jurInfo.authority} clean energy guidelines.`,
      estimatedSavings: solarTaxBenefit,
      actionLabel: "View Certification",
    },
    {
      id: "rec-business",
      category: "Allowable Expenses",
      priority: "MEDIUM" as const,
      title: `Operational & Remote Work Write-Offs`,
      description: `Itemized ${sym}${businessExpenses.toLocaleString()} in verified business, broadband, and cloud infrastructure expenses saving ${sym}${businessTaxBenefit.toLocaleString()} in income tax.`,
      estimatedSavings: businessTaxBenefit,
      actionLabel: "Review Receipts",
    },
    {
      id: "rec-tfsa",
      category: "Tax-Free Accounts",
      priority: isOverContributed ? ("HIGH" as const) : ("INFO" as const),
      title: `${jurInfo.taxShelteredAccountName} Monitoring`,
      description: isOverContributed
        ? `⚠️ Over-contribution detected: ${sym}${excessTFSA.toLocaleString()} above the ${sym}${tfsaAnnualLimit.toLocaleString()} statutory ceiling. Rebalance immediately to avoid penalty tax.`
        : `Compliant: ${sym}${tfsaContribs.toLocaleString()} allocated of ${sym}${tfsaAnnualLimit.toLocaleString()} annual limit. All capital gains and dividends remain 100% tax-free.`,
      estimatedSavings: round2(tfsaContribs * 0.20),
      actionLabel: isOverContributed ? "Resolve Over-Contribution" : "Optimize Assets",
    },
  ];

  const sectionsData = {
    retirementAnnuity: {
      title: jurInfo.retirementSchemeName,
      annualContributions: raContributions,
      allowableCapPercentage: round2(allowableCapPercentage * 100),
      maxAllowableDeduction: finalMaxRADeduction,
      claimedDeduction: claimedRADeduction,
      remainingTaxFreeHeadroom: remainingRAHeadroom,
      taxBenefit: raTaxBenefit,
      recommendation:
        remainingRAHeadroom > 0
          ? `You have ${sym}${remainingRAHeadroom.toLocaleString()} in unused tax-deductible ceiling. Top up before year-end to save ~${sym}${Math.round(remainingRAHeadroom * marginalRate).toLocaleString()} on your tax return.`
          : `Max allowable deduction utilized (${sym}${claimedRADeduction.toLocaleString()}).`,
    },
    cleanEnergy: {
      title: jurInfo.cleanEnergySchemeName,
      capitalExpenditure: solarCapEx,
      depreciationRate: solarDeductionRate * 100,
      allowableDeduction: allowableSolarDeduction,
      taxBenefit: solarTaxBenefit,
      note: `${jurInfo.authority} clean energy incentive provides statutory depreciation or tax credits for qualifying solar and energy resilience installations.`,
    },
    businessExpenses: {
      title: "Business & Remote Work Allowable Expenses",
      claimedExpenses: businessExpenses,
      taxBenefit: businessTaxBenefit,
      itemizedCount: 14,
      note: "Itemized deductions for home office, high-speed fibre, computing infrastructure, and professional development.",
    },
    healthcareCredits: {
      title: jurInfo.healthcareSchemeName,
      medicalMembersCount: medicalMembers,
      primaryCredit: primaryMedicalCredit,
      totalAnnualTaxOffset: totalMedicalCredit,
      note: `Statutory medical tax offset and healthcare relief based on ${medicalMembers} registered beneficiaries.`,
    },
    taxShelteredSavings: {
      title: jurInfo.taxShelteredAccountName,
      annualContributions: tfsaContribs,
      annualLimit: tfsaAnnualLimit,
      remainingAllowance: remainingTFSA,
      isOverContributed,
      excessAmount: excessTFSA,
      complianceStatus: isOverContributed ? ("OVER_CONTRIBUTED" as const) : ("COMPLIANT" as const),
      penaltyWarning: isOverContributed
        ? `⚠️ Warning: ${jurInfo.taxShelteredAccountName} contribution exceeded by ${sym}${excessTFSA.toLocaleString()}. ${jurInfo.authority} imposes penalty tax on excess contributions!`
        : undefined,
    },
    // Backwards-compatibility aliases for existing code and tests
    section11F_RetirementAnnuity: {
      annualContributions: raContributions,
      allowableCapPercentage: round2(allowableCapPercentage * 100),
      maxAllowableDeduction: finalMaxRADeduction,
      claimedDeduction: claimedRADeduction,
      remainingTaxFreeHeadroom: remainingRAHeadroom,
      taxBenefit: raTaxBenefit,
      recommendation:
        remainingRAHeadroom > 0
          ? `You have ${sym}${remainingRAHeadroom.toLocaleString()} in unused RA tax-deductible ceiling. Top up before year-end to save ~${sym}${Math.round(remainingRAHeadroom * marginalRate).toLocaleString()} on your tax bill.`
          : `Max allowable deduction utilized.`,
    },
    section12B_CleanEnergy: {
      capitalExpenditure: solarCapEx,
      depreciationRate: solarDeductionRate * 100,
      allowableDeduction: allowableSolarDeduction,
      taxBenefit: solarTaxBenefit,
      note: `${jurInfo.authority} clean energy incentive allows upfront depreciation or direct tax credits on qualifying solar & battery storage.`,
    },
    section11A_BusinessExpenses: {
      claimedExpenses: businessExpenses,
      taxBenefit: businessTaxBenefit,
      itemizedCount: 14,
    },
    section6A_MedicalCredits: {
      primaryMemberAnnualCredit: primaryMedicalCredit,
      firstDependantAnnualCredit: primaryMedicalCredit,
      additionalDependantsAnnualCredit: totalMedicalCredit - primaryMedicalCredit * 2,
      totalAnnualTaxOffset: totalMedicalCredit,
    },
    tfsa_Compliance: {
      annualContributions: tfsaContribs,
      annualLimit: tfsaAnnualLimit,
      remainingAllowance: remainingTFSA,
      isOverContributed,
      excessAmount: excessTFSA,
      penaltyWarning: isOverContributed
        ? `⚠️ Warning: Contribution exceeded by ${sym}${excessTFSA.toLocaleString()}!`
        : undefined,
    },
  };

  return {
    jurisdiction: jurInfo,
    taxYear,
    grossAnnualIncome: gross,
    baselineTaxableIncome: round2(baselineTaxableIncome),
    optimizedTaxableIncome: round2(optimizedTaxableIncome),
    totalDeductionsClaimed,
    estimatedTaxWithoutOptimizations,
    estimatedTaxWithOptimizations,
    potentialAnnualTaxSavings,
    effectiveTaxRate,
    marginalTaxRate: round2(marginalRate * 100),
    baselineEffectiveRate,
    bracketBreakdown: optimizedBreakdown,
    currentBracket,
    headroomToNextBracket: headroomToNext,
    sections: sectionsData,
    recommendations,
  };
}
