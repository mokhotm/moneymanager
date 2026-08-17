/**
 * South African Retirement Planning & Wealth Accumulation Engine (§11.3 / §0.11)
 * Tailored for South African retirement tax law (Section 11F, Two-Pot System, TFSA, Reg 28)
 */

export interface RetirementProfileInput {
  currentAge: number; // e.g. 51
  retirementAge: number; // e.g. 65 for males (60 for females)
  monthlyGrossIncome: number;
  monthlyNetIncome: number;
  currentRetirementSavings: number;
  monthlyRAContribution: number;
  monthlyTFSAContribution: number;
  expectedAnnualReturn: number; // e.g. 0.10 (10% nominal p.a.)
  expectedInflation: number; // e.g. 0.05 (5% CPI)
  desiredReplacementRatio: number; // e.g. 0.75 (75% of pre-retirement income)
}

export interface SouthAfricanRetirementProduct {
  id: string;
  provider: string;
  productName: string;
  type: 'RETIREMENT_ANNUITY' | 'TFSA' | 'PRESERVATION_FUND' | 'UNIT_TRUST';
  reg28Compliant: boolean;
  estimatedTIC: number; // Total Investment Charge (TER + Transaction Costs) p.a.
  features: string[];
  suitabilityScore: number; // 1-100
  pros: string[];
  cons: string[];
}

export interface YearProjection {
  age: number;
  year: number;
  openingBalance: number;
  annualContribution: number;
  taxRebateSection11F: number;
  growth: number;
  closingBalance: number;
}

export interface RetirementPlanResult {
  currentAge: number;
  retirementAge: number;
  yearsToRetirement: number;
  projectedLumpSumAt65: number;
  targetCapitalRequired: number;
  projectedMonthlyDrawdownZAR: number;
  targetMonthlyDrawdownZAR: number;
  replacementRatioProjected: number;
  capitalShortfallOrSurplus: number;
  status: 'ON_TRACK' | 'SLIGHT_SHORTFALL' | 'CRITICAL_ACCELERATION_REQUIRED';
  annualTaxRebatePotentialZAR: number;
  twoPotBreakdownAt65: {
    savingsPotAccessible: number; // 1/3
    retirementPotAnnuitized: number; // 2/3
  };
  yearlyProjections: YearProjection[];
  topProductOptions: SouthAfricanRetirementProduct[];
  strategicRecommendations: string[];
}

export function computeSouthAfricanRetirementPlan(input: RetirementProfileInput): RetirementPlanResult {
  const yearsToRetirement = Math.max(1, input.retirementAge - input.currentAge);
  const rNominal = input.expectedAnnualReturn;
  const inflation = input.expectedInflation;
  const realReturn = (1 + rNominal) / (1 + inflation) - 1;

  // Section 11F Tax Deduction Limit: 27.5% of taxable income (capped at R350,000/year)
  const annualGross = input.monthlyGrossIncome * 12;
  const maxAllowableSection11F = Math.min(350000, annualGross * 0.275);
  const plannedAnnualRA = input.monthlyRAContribution * 12;
  const effectiveDeductibleRA = Math.min(plannedAnnualRA, maxAllowableSection11F);
  
  // Approximate marginal tax bracket for SARS employee (e.g. 41% marginal rate)
  const estimatedMarginalTaxRate = 0.41;
  const annualTaxRebatePotentialZAR = effectiveDeductibleRA * estimatedMarginalTaxRate;

  // Compounding simulation
  let balance = input.currentRetirementSavings;
  const yearlyProjections: YearProjection[] = [];

  for (let year = 1; year <= yearsToRetirement; year++) {
    const age = input.currentAge + year;
    const openingBalance = balance;
    const totalAnnualContributions = (input.monthlyRAContribution + input.monthlyTFSAContribution) * 12;
    const taxRebate = effectiveDeductibleRA * estimatedMarginalTaxRate;
    
    // Assume reinvesting the tax rebate back into wealth accumulation
    const totalInflow = totalAnnualContributions + taxRebate;
    const growth = (openingBalance + totalInflow / 2) * rNominal;
    const closingBalance = openingBalance + totalInflow + growth;

    yearlyProjections.push({
      age,
      year,
      openingBalance: Math.round(openingBalance),
      annualContribution: Math.round(totalAnnualContributions),
      taxRebateSection11F: Math.round(taxRebate),
      growth: Math.round(growth),
      closingBalance: Math.round(closingBalance),
    });

    balance = closingBalance;
  }

  const projectedLumpSumAt65 = Math.round(balance);

  // Two-Pot System split at retirement (1/3 savings pot, 2/3 retirement pot)
  const twoPotBreakdownAt65 = {
    savingsPotAccessible: Math.round(projectedLumpSumAt65 * (1 / 3)),
    retirementPotAnnuitized: Math.round(projectedLumpSumAt65 * (2 / 3)),
  };

  // Safe Drawdown rule (e.g. 5% living annuity drawdown rate at age 65)
  const safeDrawdownRate = 0.05;
  const projectedMonthlyDrawdownZAR = Math.round((projectedLumpSumAt65 * safeDrawdownRate) / 12);

  // Target required capital based on replacement ratio
  const targetMonthlyDrawdownZAR = Math.round(input.monthlyNetIncome * input.desiredReplacementRatio);
  const targetCapitalRequired = Math.round((targetMonthlyDrawdownZAR * 12) / safeDrawdownRate);
  const capitalShortfallOrSurplus = projectedLumpSumAt65 - targetCapitalRequired;
  const replacementRatioProjected = Math.round((projectedMonthlyDrawdownZAR / input.monthlyNetIncome) * 100);

  let status: RetirementPlanResult['status'] = 'ON_TRACK';
  if (replacementRatioProjected < 50) {
    status = 'CRITICAL_ACCELERATION_REQUIRED';
  } else if (replacementRatioProjected < 75) {
    status = 'SLIGHT_SHORTFALL';
  }

  // Curated South African Product Comparison Matrix
  const topProductOptions: SouthAfricanRetirementProduct[] = [
    {
      id: 'sygnia-skeleton-ra',
      provider: 'Sygnia Asset Management',
      productName: 'Sygnia Skeleton Retirement Annuity (Reg 28)',
      type: 'RETIREMENT_ANNUITY',
      reg28Compliant: true,
      estimatedTIC: 0.45,
      features: ['Industry-lowest index-tracking fee (0.45% p.a.)', 'Multi-asset 70 Balanced allocation', 'Zero administration fee when investing in Sygnia funds'],
      suitabilityScore: 96,
      pros: ['Ultra low fees maximize compound interest over 14-year runway', 'Fully Regulation 28 compliant', 'Seamless online debit order setup'],
      cons: ['Passive/index tracking rather than active stock picking'],
    },
    {
      id: 'standard-bank-stanlib-ra',
      provider: 'Standard Bank / Stanlib',
      productName: 'Stanlib Multi-Manager Balanced RA',
      type: 'RETIREMENT_ANNUITY',
      reg28Compliant: true,
      estimatedTIC: 1.25,
      features: ['Direct integration with Standard Bank Online Banking & App', 'Multi-manager active diversification', 'UCount Rewards points acceleration'],
      suitabilityScore: 88,
      pros: ['Single pane of glass alongside your existing Standard Bank Cheque & Home Loan', 'Convenient debit order integration', 'Trusted tier-1 banking institution'],
      cons: ['Higher Total Investment Charge (1.25% - 1.60%) compared to pure index providers'],
    },
    {
      id: '10x-your-future-ra',
      provider: '10X Investments',
      productName: '10X Retirement Annuity Fund',
      type: 'RETIREMENT_ANNUITY',
      reg28Compliant: true,
      estimatedTIC: 0.65,
      features: ['Automated lifecycle glide path', 'Transparent direct fee structure', 'Reg 28 high equity profile'],
      suitabilityScore: 92,
      pros: ['Low transparent fees', 'No advisor intermediation fees', 'Proven indexing methodology'],
      cons: ['Limited fund customization outside 10X core portfolios'],
    },
    {
      id: 'allan-gray-ra',
      provider: 'Allan Gray',
      productName: 'Allan Gray Balanced Retirement Annuity',
      type: 'RETIREMENT_ANNUITY',
      reg28Compliant: true,
      estimatedTIC: 1.40,
      features: ['Flagship active asset manager in South Africa', 'Proven 30-year long-term alpha generation', 'Excellent platform custody and service'],
      suitabilityScore: 89,
      pros: ['Top-quartile active management and downside protection history', 'Strong offshore allocation capability'],
      cons: ['Higher performance-fee exposure and administration platform fee (~1.40%+)'],
    },
    {
      id: 'easyequities-tfsa',
      provider: 'EasyEquities',
      productName: 'Tax-Free Savings Account (TFSA) — Satrix Top 40 & MSCI World',
      type: 'TFSA',
      reg28Compliant: false, // TFSA is exempt from Reg 28 limits!
      estimatedTIC: 0.35,
      features: ['100% Tax-Free growth (no CGT, no dividend withholding tax)', 'R36,000/yr annual limit (R3,000/mo)', 'No Regulation 28 asset class limits (100% global equity permitted)'],
      suitabilityScore: 95,
      pros: ['Uncapped global offshore equity potential (100% MSCI World/S&P 500)', 'Zero platform administration fees', 'Fully accessible tax-free cash cushion at age 65'],
      cons: ['Strict R36k/yr limit with SARS penalties for over-contribution'],
    },
  ];

  const strategicRecommendations = [
    `**Max Out Section 11F RA Contributions**: You can contribute up to 27.5% of your taxable income (up to R350k/yr). This will generate an estimated **R${Math.round(annualTaxRebatePotentialZAR).toLocaleString('en-ZA')} annual tax refund from SARS**, which should be immediately reinvested into your retirement pool.`,
    `**Debt Snowball Surplus Redirection**: Once your consumer debts clear over the next ~18 months, roll the **R25,000+/mo surplus pool** straight into your retirement and ETF accumulation accounts without inflating lifestyle spending.`,
    `**Standard Bank + Low-Cost RA Combination**: If you value having your retirement inside your Standard Bank app, consider Stanlib for convenience, while pairing it with a low-cost provider like **Sygnia Skeleton RA (0.45% TIC)** to save hundreds of thousands in compounding fees over your 14-year runway to age 65.`,
    `**Utilize R36,000/yr TFSA**: Complement your RA with a Tax-Free Savings Account (R3,000/month) invested 100% in offshore equities (e.g. S&P 500 / MSCI World ETF) to build an un-annuitized, tax-free cash reserve for age 65.`,
    `**Two-Pot Liquidity Guardrail**: Protect your 1/3 Savings Pot and avoid early withdrawals to ensure full compound growth into your age 65 living annuity.`,
  ];

  return {
    currentAge: input.currentAge,
    retirementAge: input.retirementAge,
    yearsToRetirement,
    projectedLumpSumAt65,
    targetCapitalRequired,
    projectedMonthlyDrawdownZAR,
    targetMonthlyDrawdownZAR,
    replacementRatioProjected,
    capitalShortfallOrSurplus,
    status,
    annualTaxRebatePotentialZAR: Math.round(annualTaxRebatePotentialZAR),
    twoPotBreakdownAt65,
    yearlyProjections,
    topProductOptions,
    strategicRecommendations,
  };
}
