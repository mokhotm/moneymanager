export interface SABankConnector {
  id: string;
  institution: string;
  displayName: string;
  primaryColor: string;
  logoText: string;
  supportedProducts: string[];
  status: string;
  isRecommended: boolean;
}

/**
 * South African Bank connector registry (FSCA-Regulated Open Finance)
 */
export const SA_BANK_CONNECTORS: SABankConnector[] = [
  {
    id: "SBG",
    institution: "Standard Bank",
    displayName: "Standard Bank of South Africa",
    primaryColor: "#0033aa",
    logoText: "SBG",
    supportedProducts: ["Prestige Account", "MyMo Account", "Titanium Credit Card", "Home Loan", "Revolving Credit"],
    status: "ACTIVE",
    isRecommended: false,
  },
  {
    id: "CAP",
    institution: "Capitec Bank",
    displayName: "Capitec Global One & Business",
    primaryColor: "#00487c",
    logoText: "CAP",
    supportedProducts: ["Global One Transactional", "Live Better Savings", "Credit Card"],
    status: "ACTIVE",
    isRecommended: false,
  },
  {
    id: "FNB",
    institution: "First National Bank (FNB)",
    displayName: "FNB FirstRand Bank",
    primaryColor: "#009688",
    logoText: "FNB",
    supportedProducts: ["Fusion Account", "eBucks Cheque", "Aspire / Premier", "Credit Card"],
    status: "ACTIVE",
    isRecommended: false,
  },
  {
    id: "NED",
    institution: "Nedbank",
    displayName: "Nedbank Greenbacks",
    primaryColor: "#006633",
    logoText: "NED",
    supportedProducts: ["MiGoals Current Account", "Platinum Credit Card", "Personal Loan"],
    status: "ACTIVE",
    isRecommended: false,
  },
  {
    id: "INV",
    institution: "Investec",
    displayName: "Investec Private Bank",
    primaryColor: "#1e293b",
    logoText: "INV",
    supportedProducts: ["Private Bank Account", "Programmable Banking Card", "Prime Money Market"],
    status: "ACTIVE",
    isRecommended: false,
  },
  {
    id: "ABSA",
    institution: "ABSA Bank",
    displayName: "ABSA Group Limited",
    primaryColor: "#b91c1c",
    logoText: "ABSA",
    supportedProducts: ["Transact Plus", "Premium Banking", "Flexi Core Credit Card"],
    status: "ACTIVE",
    isRecommended: false,
  },
  {
    id: "DISC",
    institution: "Discovery Bank",
    displayName: "Discovery Bank Vitality Money",
    primaryColor: "#7c3aed",
    logoText: "DISC",
    supportedProducts: ["Vitality Transaction Account", "Purple / Black Card", "Dynamic Interest Savings"],
    status: "ACTIVE",
    isRecommended: false,
  },
  {
    id: "TYME",
    institution: "TymeBank",
    displayName: "TymeBank South Africa",
    primaryColor: "#ea580c",
    logoText: "TYME",
    supportedProducts: ["EveryDay Account", "GoalSave Pockets"],
    status: "ACTIVE",
    isRecommended: false,
  },
];
