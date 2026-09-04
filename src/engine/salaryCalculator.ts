/**
 * Global Multi-Jurisdiction Salary & Remuneration Engine
 * High-precision payroll and salary increase calculation supporting:
 * - South Africa (SARS / PAYE)
 * - United States (IRS / Federal / FICA)
 * - United Kingdom (HMRC / PAYE / NI)
 * - Canada (CRA / Federal / CPP / EI)
 * - Australia (ATO / Medicare / Super)
 * - European Union (EU Harmonized / Social Contributions)
 * - Universal / Global Standard
 */

import { TaxJurisdiction, JURISDICTIONS, TaxJurisdictionInfo } from "./taxOptimization";

export { type TaxJurisdiction, JURISDICTIONS };

export interface TaxBracket {
  min: number;
  max: number | null;
  baseTax: number;
  rate: number;
  label?: string;
}

export const GLOBAL_TAX_BRACKETS: Record<TaxJurisdiction, TaxBracket[]> = {
  ZA: [
    { min: 0, max: 237100, baseTax: 0, rate: 0.18, label: "Bracket 1 (18%)" },
    { min: 237100, max: 370500, baseTax: 42678, rate: 0.26, label: "Bracket 2 (26%)" },
    { min: 370500, max: 512800, baseTax: 77362, rate: 0.31, label: "Bracket 3 (31%)" },
    { min: 512800, max: 673000, baseTax: 121475, rate: 0.36, label: "Bracket 4 (36%)" },
    { min: 673000, max: 857900, baseTax: 179147, rate: 0.39, label: "Bracket 5 (39%)" },
    { min: 857900, max: 1817000, baseTax: 251258, rate: 0.41, label: "Bracket 6 (41%)" },
    { min: 1817000, max: null, baseTax: 644489, rate: 0.45, label: "Bracket 7 (45% Top Marginal)" },
  ],
  US: [
    { min: 0, max: 11600, baseTax: 0, rate: 0.10, label: "Tier 1 (10%)" },
    { min: 11600, max: 47150, baseTax: 1160, rate: 0.12, label: "Tier 2 (12%)" },
    { min: 47150, max: 100525, baseTax: 5426, rate: 0.22, label: "Tier 3 (22%)" },
    { min: 100525, max: 191950, baseTax: 17168.5, rate: 0.24, label: "Tier 4 (24%)" },
    { min: 191950, max: 243725, baseTax: 39110.5, rate: 0.32, label: "Tier 5 (32%)" },
    { min: 243725, max: 609350, baseTax: 55678.5, rate: 0.35, label: "Tier 6 (35%)" },
    { min: 609350, max: null, baseTax: 183647.25, rate: 0.37, label: "Tier 7 (37% Top Marginal)" },
  ],
  UK: [
    { min: 0, max: 12570, baseTax: 0, rate: 0.00, label: "Personal Allowance (0%)" },
    { min: 12570, max: 50270, baseTax: 0, rate: 0.20, label: "Basic Rate (20%)" },
    { min: 50270, max: 125140, baseTax: 7540, rate: 0.40, label: "Higher Rate (40%)" },
    { min: 125140, max: null, baseTax: 37488, rate: 0.45, label: "Additional Rate (45% Top Marginal)" },
  ],
  CA: [
    { min: 0, max: 15705, baseTax: 0, rate: 0.00, label: "Basic Personal Amount (0%)" },
    { min: 15705, max: 55867, baseTax: 0, rate: 0.15, label: "Federal Tier 1 (15%)" },
    { min: 55867, max: 111733, baseTax: 6024.3, rate: 0.205, label: "Federal Tier 2 (20.5%)" },
    { min: 111733, max: 173205, baseTax: 17476.8, rate: 0.26, label: "Federal Tier 3 (26%)" },
    { min: 173205, max: 246752, baseTax: 33459.5, rate: 0.29, label: "Federal Tier 4 (29%)" },
    { min: 246752, max: null, baseTax: 54788.1, rate: 0.33, label: "Federal Tier 5 (33% Top Marginal)" },
  ],
  AU: [
    { min: 0, max: 18200, baseTax: 0, rate: 0.00, label: "Tax-Free Threshold (0%)" },
    { min: 18200, max: 45000, baseTax: 0, rate: 0.16, label: "Stage 3 Tier 1 (16%)" },
    { min: 45000, max: 135000, baseTax: 4288, rate: 0.30, label: "Stage 3 Tier 2 (30%)" },
    { min: 135000, max: 190000, baseTax: 31288, rate: 0.37, label: "Stage 3 Tier 3 (37%)" },
    { min: 190000, max: null, baseTax: 51638, rate: 0.45, label: "Stage 3 Tier 4 (45% Top Marginal)" },
  ],
  EU: [
    { min: 0, max: 11000, baseTax: 0, rate: 0.00, label: "Tax-Free Basic (0%)" },
    { min: 11000, max: 35000, baseTax: 0, rate: 0.20, label: "Tier 1 (20%)" },
    { min: 35000, max: 65000, baseTax: 4800, rate: 0.30, label: "Tier 2 (30%)" },
    { min: 65000, max: 150000, baseTax: 13800, rate: 0.42, label: "Tier 3 (42%)" },
    { min: 15000, max: null, baseTax: 49500, rate: 0.45, label: "Tier 4 (45% Top Marginal)" },
  ],
  GLOBAL: [
    { min: 0, max: 15000, baseTax: 0, rate: 0.00, label: "Standard Allowance (0%)" },
    { min: 15000, max: 50000, baseTax: 0, rate: 0.15, label: "Standard Tier 1 (15%)" },
    { min: 50000, max: 100000, baseTax: 5250, rate: 0.25, label: "Standard Tier 2 (25%)" },
    { min: 100000, max: 200000, baseTax: 17750, rate: 0.32, label: "Standard Tier 3 (32%)" },
    { min: 200000, max: null, baseTax: 49750, rate: 0.38, label: "Standard Tier 4 (38% Top Marginal)" },
  ],
};

// Backward-compatibility alias for South Africa
export const SARS_TAX_BRACKETS_2026 = GLOBAL_TAX_BRACKETS.ZA;

export const SARS_REBATES_2026 = {
  primary: 17235, // Under 65
  secondary: 9444, // 65 to 74
  tertiary: 3145, // 75+
};

export const SARS_MTC_2026 = {
  mainMemberMonthly: 364,
  firstDependantMonthly: 364,
  additionalDependantMonthly: 246,
};

export const UIF_STATUTORY_MAX_MONTHLY = 177.12; // 1% of R 17,712 cap

export interface PayslipInput {
  jurisdiction?: TaxJurisdiction;
  basicSalaryMonthly: number;
  medicalAllowanceMonthly?: number;
  otherAllowancesMonthly?: number;
  pensionContributionMonthly?: number; // Pre-tax retirement / 401(k) / SIPP / RRSP deduction
  medicalAidContributionMonthly?: number; // Medical scheme deduction
  medicalAidDependants?: number; // Count of dependants
  unionFeesMonthly?: number; // Professional / union dues
  age?: number;
}

export interface PayslipBreakdown {
  jurisdiction: TaxJurisdiction;
  currencySymbol: string;
  currencyCode: string;
  taxAuthorityName: string;
  grossRemunerationMonthly: number;
  annualGross: number;
  taxableIncomeAnnual: number;
  annualPAYEBeforeCredits: number;
  annualRebates: number;
  annualMedicalCredits: number;
  annualPAYE: number;
  monthlyPAYE: number;
  monthlySocialSecurity: number; // UIF in ZA, FICA in US, NI in UK, CPP/EI in CA
  monthlyUIF?: number; // Backward compatibility alias for ZA
  socialSecurityLabel: string;
  monthlyMedicalAid: number;
  monthlyPension: number;
  monthlyUnionFees: number;
  totalMonthlyDeductions: number;
  netTakeHomeMonthly: number;
  marginalTaxRate: number;
  effectiveTaxRate: number;
  retentionRatePercent: number; // Percentage of next Rand/Dollar kept in pocket (100 - marginal rate)
}

/**
 * Calculates statutory social security / mandatory payroll taxes per jurisdiction
 */
function calculateSocialSecurity(
  monthlyGross: number,
  jurisdiction: TaxJurisdiction
): { amount: number; label: string } {
  switch (jurisdiction) {
    case "ZA":
      // UIF: 1% capped at R177.12
      return {
        amount: Math.min(UIF_STATUTORY_MAX_MONTHLY, Math.round(monthlyGross * 0.01 * 100) / 100),
        label: "UIF (Unemployment Insurance)",
      };
    case "US":
      // FICA: 6.2% Social Security (capped at $168,600/yr = $14,050/mo) + 1.45% Medicare (uncapped)
      const ssCap = 14050;
      const ssTax = Math.min(monthlyGross, ssCap) * 0.062;
      const medTax = monthlyGross * 0.0145;
      return {
        amount: Math.round((ssTax + medTax) * 100) / 100,
        label: "FICA (Social Security & Medicare 7.65%)",
      };
    case "UK":
      // National Insurance (Class 1): 8% between £1,048/mo and £4,189/mo, 2% above
      let ni = 0;
      if (monthlyGross > 1048) {
        const band1 = Math.min(monthlyGross, 4189) - 1048;
        ni += band1 * 0.08;
        if (monthlyGross > 4189) {
          ni += (monthlyGross - 4189) * 0.02;
        }
      }
      return {
        amount: Math.round(ni * 100) / 100,
        label: "National Insurance (NI Class 1)",
      };
    case "CA":
      // CPP (5.95% capped at ~$320/mo) + EI (1.66% capped at ~$87/mo)
      const cpp = Math.min(monthlyGross * 0.0595, 320);
      const ei = Math.min(monthlyGross * 0.0166, 87);
      return {
        amount: Math.round((cpp + ei) * 100) / 100,
        label: "CPP & EI (Statutory Withholdings)",
      };
    case "AU":
      // Medicare Levy: 2.0% of taxable remuneration
      return {
        amount: Math.round(monthlyGross * 0.02 * 100) / 100,
        label: "Medicare Levy (2.0%)",
      };
    case "EU":
      // Statutory Health & Social Insurance ~ 10%
      return {
        amount: Math.round(monthlyGross * 0.09 * 100) / 100,
        label: "Social Insurance & Health Contribution",
      };
    case "GLOBAL":
    default:
      // Universal standard social withholding (1.5%)
      return {
        amount: Math.round(monthlyGross * 0.015 * 100) / 100,
        label: "Social & Mandatory Statutory Withholding",
      };
  }
}

/**
 * Calculate full global payslip breakdown from monthly components
 */
export function calculatePayslipBreakdown(input: PayslipInput): PayslipBreakdown {
  const jurisdiction: TaxJurisdiction = input.jurisdiction || "ZA";
  const jurInfo: TaxJurisdictionInfo = JURISDICTIONS[jurisdiction] || JURISDICTIONS.ZA;
  const currencySymbol = jurInfo.currencySymbol;
  const currencyCode = jurInfo.currencyCode;
  const taxAuthorityName = jurInfo.authority;

  const basic = input.basicSalaryMonthly || 0;
  const medAllowance = input.medicalAllowanceMonthly || 0;
  const otherAllowance = input.otherAllowancesMonthly || 0;
  const grossMonthly = basic + medAllowance + otherAllowance;
  const annualGross = grossMonthly * 12;

  // Pre-tax retirement fund deduction (Section 11F in ZA, 401k in US, SIPP in UK, RRSP in CA)
  const pensionMonthly = input.pensionContributionMonthly || 0;
  let allowablePensionAnnual = pensionMonthly * 12;
  if (jurisdiction === "ZA") {
    allowablePensionAnnual = Math.min(allowablePensionAnnual, annualGross * 0.275, 350000);
  } else if (jurisdiction === "US") {
    allowablePensionAnnual = Math.min(allowablePensionAnnual, 23000); // 401(k) annual elective deferral cap
  } else if (jurisdiction === "UK") {
    allowablePensionAnnual = Math.min(allowablePensionAnnual, 60000); // SIPP annual allowance
  } else if (jurisdiction === "CA") {
    allowablePensionAnnual = Math.min(allowablePensionAnnual, annualGross * 0.18, 31560);
  } else if (jurisdiction === "AU") {
    allowablePensionAnnual = Math.min(allowablePensionAnnual, 30000);
  }

  const taxableIncomeAnnual = Math.max(0, annualGross - allowablePensionAnnual);

  // Progressive Tax calculation based on jurisdiction
  const brackets = GLOBAL_TAX_BRACKETS[jurisdiction] || GLOBAL_TAX_BRACKETS.ZA;
  let baseTax = 0;
  let marginalRate = brackets[0].rate;

  for (const bracket of brackets) {
    if (bracket.max === null || taxableIncomeAnnual <= bracket.max) {
      marginalRate = bracket.rate;
      baseTax = bracket.baseTax + (taxableIncomeAnnual - bracket.min) * bracket.rate;
      break;
    }
  }

  // Rebates & Credits
  const age = input.age ?? 51;
  let totalRebates = 0;
  let annualMTC = 0;

  if (jurisdiction === "ZA") {
    totalRebates = SARS_REBATES_2026.primary;
    if (age >= 65) totalRebates += SARS_REBATES_2026.secondary;
    if (age >= 75) totalRebates += SARS_REBATES_2026.tertiary;

    // Section 6A Medical Scheme Fees Tax Credit (MTC)
    const dependants = input.medicalAidDependants ?? 2;
    if (input.medicalAidContributionMonthly && input.medicalAidContributionMonthly > 0) {
      let monthlyMTC = SARS_MTC_2026.mainMemberMonthly;
      if (dependants >= 1) monthlyMTC += SARS_MTC_2026.firstDependantMonthly;
      if (dependants > 1) monthlyMTC += (dependants - 1) * SARS_MTC_2026.additionalDependantMonthly;
      annualMTC = monthlyMTC * 12;
    }
  } else if (jurisdiction === "US") {
    // US Standard Deduction ($14,600 single) provides baseline relief
    // Already accounted in low tier, or applied as base tax relief
  }

  // Net annual and monthly income tax
  const annualPAYE = Math.max(0, baseTax - totalRebates - annualMTC);
  const monthlyPAYE = Math.round((annualPAYE / 12) * 100) / 100;

  // Statutory Social Security / Withholding
  const social = calculateSocialSecurity(grossMonthly, jurisdiction);

  const monthlyMedicalAid = input.medicalAidContributionMonthly || 0;
  const monthlyUnionFees = input.unionFeesMonthly || 0;

  const totalDeductions = Math.round(
    (monthlyPAYE + social.amount + monthlyMedicalAid + pensionMonthly + monthlyUnionFees) * 100
  ) / 100;

  const netTakeHome = Math.round((grossMonthly - totalDeductions) * 100) / 100;
  const effectiveTaxRate = grossMonthly > 0 ? (monthlyPAYE / grossMonthly) * 100 : 0;
  const retentionRatePercent = Math.round((1 - marginalRate) * 1000) / 10;

  return {
    jurisdiction,
    currencySymbol,
    currencyCode,
    taxAuthorityName,
    grossRemunerationMonthly: Math.round(grossMonthly * 100) / 100,
    annualGross: Math.round(annualGross * 100) / 100,
    taxableIncomeAnnual: Math.round(taxableIncomeAnnual * 100) / 100,
    annualPAYEBeforeCredits: Math.round(baseTax * 100) / 100,
    annualRebates: totalRebates,
    annualMedicalCredits: annualMTC,
    annualPAYE: Math.round(annualPAYE * 100) / 100,
    monthlyPAYE,
    monthlySocialSecurity: social.amount,
    monthlyUIF: social.amount,
    socialSecurityLabel: social.label,
    monthlyMedicalAid,
    monthlyPension: pensionMonthly,
    monthlyUnionFees,
    totalMonthlyDeductions: totalDeductions,
    netTakeHomeMonthly: netTakeHome,
    marginalTaxRate: marginalRate * 100,
    effectiveTaxRate: Math.round(effectiveTaxRate * 10) / 10,
    retentionRatePercent,
  };
}

export interface SalaryIncreaseResult {
  current: PayslipBreakdown;
  projected: PayslipBreakdown;
  increaseType: "PERCENTAGE" | "FIXED_AMOUNT" | "TARGET_NET";
  increaseValue: number;
  grossDeltaMonthly: number;
  netDeltaMonthly: number;
  payeDeltaMonthly: number;
  retentionPercentOfIncrease: number;
  annualNetGain: number;
  backpaySimulation?: {
    months: number;
    grossBackpayTotal: number;
    taxWithheldTotal: number;
    netLumpSumPayout: number;
  };
}

/**
 * Model a salary increase across any global jurisdiction
 */
export function simulateSalaryIncrease(
  baseInput: PayslipInput,
  options: {
    type: "PERCENTAGE" | "FIXED_AMOUNT";
    value: number;
    backpayMonths?: number;
  }
): SalaryIncreaseResult {
  const current = calculatePayslipBreakdown(baseInput);

  let newBasic = baseInput.basicSalaryMonthly;
  if (options.type === "PERCENTAGE") {
    newBasic = baseInput.basicSalaryMonthly * (1 + options.value / 100);
  } else {
    newBasic = baseInput.basicSalaryMonthly + options.value;
  }

  const projectedInput: PayslipInput = {
    ...baseInput,
    basicSalaryMonthly: newBasic,
  };

  const projected = calculatePayslipBreakdown(projectedInput);

  const grossDelta = projected.grossRemunerationMonthly - current.grossRemunerationMonthly;
  const netDelta = projected.netTakeHomeMonthly - current.netTakeHomeMonthly;
  const payeDelta = projected.monthlyPAYE - current.monthlyPAYE;
  const retentionPercent = grossDelta > 0 ? Math.round((netDelta / grossDelta) * 1000) / 10 : 0;

  let backpaySimulation: SalaryIncreaseResult["backpaySimulation"] | undefined;
  if (options.backpayMonths && options.backpayMonths > 0) {
    const months = options.backpayMonths;
    const grossBackpayTotal = Math.round(grossDelta * months * 100) / 100;
    const taxWithheldTotal = Math.round(payeDelta * months * 100) / 100;
    const netLumpSumPayout = Math.round(netDelta * months * 100) / 100;

    backpaySimulation = {
      months,
      grossBackpayTotal,
      taxWithheldTotal,
      netLumpSumPayout,
    };
  }

  return {
    current,
    projected,
    increaseType: options.type,
    increaseValue: options.value,
    grossDeltaMonthly: Math.round(grossDelta * 100) / 100,
    netDeltaMonthly: Math.round(netDelta * 100) / 100,
    payeDeltaMonthly: Math.round(payeDelta * 100) / 100,
    retentionPercentOfIncrease: retentionPercent,
    annualNetGain: Math.round(netDelta * 12 * 100) / 100,
    backpaySimulation,
  };
}

/**
 * Reverse-engineer required Gross Salary for a desired Target Net Take-Home pay in any jurisdiction
 */
export function solveGrossForTargetNet(
  targetNetMonthly: number,
  baseInput: Omit<PayslipInput, "basicSalaryMonthly">
): {
  requiredBasicSalaryMonthly: number;
  requiredGrossMonthly: number;
  result: PayslipBreakdown;
} {
  let low = targetNetMonthly;
  let high = targetNetMonthly * 2.8;
  let bestBasic = low;
  let bestResult = calculatePayslipBreakdown({ ...baseInput, basicSalaryMonthly: low });

  for (let iter = 0; iter < 45; iter++) {
    const mid = (low + high) / 2;
    const result = calculatePayslipBreakdown({ ...baseInput, basicSalaryMonthly: mid });
    const diff = result.netTakeHomeMonthly - targetNetMonthly;

    if (Math.abs(diff) < 0.5) {
      bestBasic = mid;
      bestResult = result;
      break;
    }

    if (diff < 0) {
      low = mid;
    } else {
      high = mid;
    }
    bestBasic = mid;
    bestResult = result;
  }

  return {
    requiredBasicSalaryMonthly: Math.round(bestBasic * 100) / 100,
    requiredGrossMonthly: bestResult.grossRemunerationMonthly,
    result: bestResult,
  };
}

// Global Sector Archetypes per country
export const JURISDICTION_DEFAULT_SALARIES: Record<TaxJurisdiction, { basic: number; allowance: number; pension: number; medical: number; label: string }> = {
  ZA: {
    basic: 115641.02,
    allowance: 5210.53,
    pension: 0,
    medical: 6987.00,
    label: "South Africa (Senior Specialist / Management)",
  },
  US: {
    basic: 9500.00,
    allowance: 500.00,
    pension: 600.00, // 401(k)
    medical: 450.00, // Health insurance premium
    label: "United States (Tech / Professional Standard)",
  },
  UK: {
    basic: 6200.00,
    allowance: 300.00,
    pension: 310.00, // Workplace pension 5%
    medical: 120.00, // Private medical
    label: "United Kingdom (London / Regional Corporate)",
  },
  CA: {
    basic: 7800.00,
    allowance: 400.00,
    pension: 400.00, // Group RRSP
    medical: 180.00,
    label: "Canada (Metro Enterprise Standard)",
  },
  AU: {
    basic: 8500.00,
    allowance: 500.00,
    pension: 950.00, // Superannuation concessional
    medical: 200.00,
    label: "Australia (Professional & Executive)",
  },
  EU: {
    basic: 5800.00,
    allowance: 300.00,
    pension: 250.00,
    medical: 250.00,
    label: "European Union (Harmonized Corporate)",
  },
  GLOBAL: {
    basic: 7000.00,
    allowance: 500.00,
    pension: 350.00,
    medical: 200.00,
    label: "International / Remote Specialist",
  },
};
