/**
 * Tax & Audit-Proof Compliance Optimization Engine (§Vector 6 / 100x Architecture)
 * Computes allowable tax deductions under South African Income Tax Act (SARS):
 * - Section 11(a): Business & freelance allowable expenditure
 * - Section 12B / 12BA: Solar & clean energy incentive
 * - Section 11F: Retirement Annuity 27.5% ceiling (capped at R350,000/yr)
 * - TFSA: Tax-Free Savings Account annual R36,000 limit & penalty prevention
 * - Section 6A: Medical Scheme Fees Tax Credits (MTC)
 */

import { round2 } from "./snowball";

export interface TaxProfileInput {
  grossAnnualIncome: number;
  retirementAnnuityAnnualContributions: number;
  pensionFundAnnualContributions?: number;
  medicalAidMembersCount?: number;
  solarCapitalExpenditure?: number;
  businessExpensesTotal?: number;
  tfsaAnnualContributions?: number;
}

export interface TaxOptimizationResult {
  taxYear: number;
  grossAnnualIncome: number;
  estimatedTaxWithoutOptimizations: number;
  estimatedTaxWithOptimizations: number;
  potentialAnnualTaxSavings: number;
  effectiveTaxRate: number;
  sections: {
    section11F_RetirementAnnuity: {
      annualContributions: number;
      allowableCapPercentage: number; // 27.5%
      maxAllowableDeduction: number; // capped at min(27.5% of income, R350,000)
      claimedDeduction: number;
      remainingTaxFreeHeadroom: number;
      taxBenefit: number;
      recommendation: string;
    };
    section12B_CleanEnergy: {
      capitalExpenditure: number;
      depreciationRate: number; // 100% or 125%
      allowableDeduction: number;
      taxBenefit: number;
      note: string;
    };
    section11A_BusinessExpenses: {
      claimedExpenses: number;
      taxBenefit: number;
      itemizedCount: number;
    };
    section6A_MedicalCredits: {
      primaryMemberAnnualCredit: number; // R364/mo = R4,368/yr
      firstDependantAnnualCredit: number; // R364/mo = R4,368/yr
      additionalDependantsAnnualCredit: number; // R246/mo = R2,952/yr
      totalAnnualTaxOffset: number;
    };
    tfsa_Compliance: {
      annualContributions: number;
      annualLimit: number; // R36,000
      remainingAllowance: number;
      isOverContributed: boolean;
      excessAmount: number;
      penaltyWarning?: string;
    };
  };
}

/**
 * 2026/2027 SARS Individual Income Tax Brackets
 */
function calculateSARSTax(taxableIncome: number): number {
  if (taxableIncome <= 237100) {
    return taxableIncome * 0.18;
  } else if (taxableIncome <= 370500) {
    return 42678 + (taxableIncome - 237100) * 0.26;
  } else if (taxableIncome <= 512800) {
    return 77362 + (taxableIncome - 370500) * 0.31;
  } else if (taxableIncome <= 673000) {
    return 121475 + (taxableIncome - 512800) * 0.36;
  } else if (taxableIncome <= 857900) {
    return 179147 + (taxableIncome - 673000) * 0.39;
  } else if (taxableIncome <= 1817000) {
    return 251258 + (taxableIncome - 857900) * 0.41;
  } else {
    return 644489 + (taxableIncome - 1817000) * 0.45;
  }
}

/**
 * Primary Tax Rebate (Below age 65)
 */
const PRIMARY_REBATE_2026 = 17235;

export function evaluateTaxOptimization(input: TaxProfileInput, taxYear = 2026): TaxOptimizationResult {
  const gross = round2(input.grossAnnualIncome);
  const raContributions = round2(input.retirementAnnuityAnnualContributions + (input.pensionFundAnnualContributions || 0));
  const solarCapEx = round2(input.solarCapitalExpenditure || 0);
  const businessExpenses = round2(input.businessExpensesTotal || 0);
  const tfsaContribs = round2(input.tfsaAnnualContributions || 0);
  const medicalMembers = input.medicalAidMembersCount ?? 3; // Default 3 (Primary + Spouse + 1 Child)

  // 1. Section 11F Retirement Annuity Cap (27.5% of gross, max R350,000)
  const allowable27_5 = round2(gross * 0.275);
  const maxRADeduction = Math.min(350000, allowable27_5);
  const claimedRADeduction = Math.min(raContributions, maxRADeduction);
  const remainingRAHeadroom = round2(Math.max(0, maxRADeduction - raContributions));

  // 2. Section 12B Solar Clean Energy Deduction (100% upfront depreciation)
  const allowableSolarDeduction = solarCapEx;

  // 3. Section 6A Medical Scheme Fees Tax Credit (Direct bottom-line tax offset)
  const primaryCredit = 364 * 12; // R4,368
  const firstDepCredit = medicalMembers >= 2 ? 364 * 12 : 0;
  const addDepCredit = medicalMembers > 2 ? (medicalMembers - 2) * 246 * 12 : 0;
  const totalMedicalCredit = primaryCredit + firstDepCredit + addDepCredit;

  // 4. TFSA Limits
  const tfsaAnnualLimit = 36000;
  const isOverContributed = tfsaContribs > tfsaAnnualLimit;
  const excessTFSA = Math.max(0, tfsaContribs - tfsaAnnualLimit);
  const remainingTFSA = Math.max(0, tfsaAnnualLimit - tfsaContribs);

  // Baseline Tax without optimizations
  const baselineTaxableIncome = gross;
  const rawBaselineTax = calculateSARSTax(baselineTaxableIncome);
  const estimatedTaxWithoutOptimizations = Math.max(0, round2(rawBaselineTax - PRIMARY_REBATE_2026));

  // Optimized Taxable Income
  const totalDeductions = claimedRADeduction + allowableSolarDeduction + businessExpenses;
  const optimizedTaxableIncome = Math.max(0, gross - totalDeductions);
  const rawOptimizedTax = calculateSARSTax(optimizedTaxableIncome);
  const estimatedTaxWithOptimizations = Math.max(0, round2(rawOptimizedTax - PRIMARY_REBATE_2026 - totalMedicalCredit));

  const potentialAnnualTaxSavings = Math.max(0, round2(estimatedTaxWithoutOptimizations - estimatedTaxWithOptimizations));
  const effectiveTaxRate = gross > 0 ? round2((estimatedTaxWithOptimizations / gross) * 100) : 0;

  const marginalRate = gross > 857900 ? 0.41 : gross > 673000 ? 0.39 : 0.36;
  const raTaxBenefit = round2(claimedRADeduction * marginalRate);
  const solarTaxBenefit = round2(allowableSolarDeduction * marginalRate);
  const businessTaxBenefit = round2(businessExpenses * marginalRate);

  return {
    taxYear,
    grossAnnualIncome: gross,
    estimatedTaxWithoutOptimizations,
    estimatedTaxWithOptimizations,
    potentialAnnualTaxSavings,
    effectiveTaxRate,
    sections: {
      section11F_RetirementAnnuity: {
        annualContributions: raContributions,
        allowableCapPercentage: 27.5,
        maxAllowableDeduction: maxRADeduction,
        claimedDeduction: claimedRADeduction,
        remainingTaxFreeHeadroom: remainingRAHeadroom,
        taxBenefit: raTaxBenefit,
        recommendation:
          remainingRAHeadroom > 0
            ? `You have R${remainingRAHeadroom.toLocaleString()} in unused RA tax-deductible ceiling. Top up before 28 February to save ~R${Math.round(remainingRAHeadroom * marginalRate).toLocaleString()} on your SARS tax bill.`
            : "Max allowable RA deduction utilized (100% capacity).",
      },
      section12B_CleanEnergy: {
        capitalExpenditure: solarCapEx,
        depreciationRate: 100,
        allowableDeduction: allowableSolarDeduction,
        taxBenefit: solarTaxBenefit,
        note: "Section 12B/12BA clean energy incentive allows 100% upfront depreciation on qualifying solar PV & battery storage systems.",
      },
      section11A_BusinessExpenses: {
        claimedExpenses: businessExpenses,
        taxBenefit: businessTaxBenefit,
        itemizedCount: 14,
      },
      section6A_MedicalCredits: {
        primaryMemberAnnualCredit: primaryCredit,
        firstDependantAnnualCredit: firstDepCredit,
        additionalDependantsAnnualCredit: addDepCredit,
        totalAnnualTaxOffset: totalMedicalCredit,
      },
      tfsa_Compliance: {
        annualContributions: tfsaContribs,
        annualLimit: tfsaAnnualLimit,
        remainingAllowance: remainingTFSA,
        isOverContributed,
        excessAmount: excessTFSA,
        penaltyWarning: isOverContributed
          ? `⚠️ Warning: TFSA contribution exceeded by R${excessTFSA.toLocaleString()}. SARS imposes a 40% penalty tax on excess contributions!`
          : undefined,
      },
    },
  };
}
