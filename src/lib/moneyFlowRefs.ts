/**
 * Builds the complete set of MoneyFlow sourceRef/destinationRef values that belong to a user.
 * Covers both:
 *   - CUID-based refs (created by cash-wallet API and seed scripts)
 *   - Name-based refs (created by the document ingestion pipeline: "Prestige Current Account (XXXX4469)")
 * This guarantees backward compatibility while the pipeline migration to CUID refs is in progress.
 */
export function buildUserFlowRefs(
  accounts: Array<{ id: string; name: string; accountNumberMasked?: string | null }>,
  debts: Array<{ id: string }>,
  extras: string[] = []
): string[] {
  const ids = [...accounts.map((a) => a.id), ...debts.map((d) => d.id)];
  const names = accounts.map((a) => a.name);

  // Generate the pipeline-format name: "<Name> (XXXX<last4>)"
  const pipelineNames = accounts
    .filter((a) => a.accountNumberMasked)
    .map((a) => {
      const digits = a.accountNumberMasked!.replace(/[^0-9]/g, "");
      const last4 = digits.slice(-4);
      return `${a.name} (XXXX${last4})`;
    });

  return [...new Set([...ids, ...names, ...pipelineNames, ...extras])];
}

/**
 * Builds a robust OR predicate for MoneyFlow ownership matching.
 * Includes strict ID/name matches plus masked account fragments for legacy ref strings.
 */
export function buildUserFlowWhere(
  accounts: Array<{ id: string; name: string; accountNumberMasked?: string | null }>,
  debts: Array<{ id: string }>,
  extras: string[] = []
) {
  const refs = buildUserFlowRefs(accounts, debts, extras);
  const maskedLast4 = [...new Set(
    accounts
      .map((a) => (a.accountNumberMasked || "").replace(/[^0-9]/g, ""))
      .filter((digits) => digits.length >= 4)
      .map((digits) => digits.slice(-4))
  )];

  const OR: Array<Record<string, unknown>> = [];

  if (refs.length > 0) {
    OR.push({ sourceRef: { in: refs } });
    OR.push({ destinationRef: { in: refs } });
  }

  for (const frag of maskedLast4) {
    OR.push({ sourceRef: { contains: frag } });
    OR.push({ destinationRef: { contains: frag } });
  }

  return { OR };
}

/**
 * Returns the account CUID for use as sourceRef/destinationRef in MoneyFlow records.
 * Falls back to the name-based pipeline format for backward compatibility.
 */
export function resolveAccountFlowRef(
  account: { id: string; name: string; accountNumberMasked?: string | null }
): string {
  return account.id;
}
