import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";
import { getUserEntityScope } from "@/lib/userEntityScope";

/** GET /api/documents — list documents for the current user with enriched names & account metadata */
export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scope = await getUserEntityScope(userId);
    if (scope.allEntityIds.length === 0) {
      return NextResponse.json([]);
    }

    const documents = await prisma.document.findMany({
      where: {
        relatedEntityId: { in: scope.allEntityIds },
      },
      orderBy: { uploadedAt: "desc" },
    });

    const { accountMap, incomeMap, assetMap, debtMap } = scope;

    const enriched = documents.map((doc) => {
      const parsedData = (doc.parsedData as any) || {};
      const parsedFields = parsedData.parsedFields || parsedData;

      let documentName = "";
      let institution = "";
      let accountName = "";
      let accountNumber = "";

      // Check linked entity
      if (doc.relatedEntityType === "ACCOUNT") {
        const acc = accountMap.get(doc.relatedEntityId);
        if (acc) {
          institution = acc.institution;
          accountName = acc.name;
          accountNumber = acc.accountNumberMasked || "";
        }
      } else if (doc.relatedEntityType === "DEBT") {
        const debt = debtMap.get(doc.relatedEntityId);
        if (debt?.account) {
          institution = debt.account.institution;
          accountName = debt.account.name;
          accountNumber = debt.account.accountNumberMasked || "";
        }
      } else if (doc.relatedEntityType === "INCOME") {
        const inc = incomeMap.get(doc.relatedEntityId);
        if (inc) {
          institution = "SARS / Employer";
          accountName = inc.sourceName;
        }
      } else if (doc.relatedEntityType === "ASSET") {
        const asset = assetMap.get(doc.relatedEntityId);
        if (asset) {
          institution = asset.type;
          accountName = asset.name;
        }
      }

      // Use explicit unknown labels when no linked entity metadata exists.
      if (!accountName) {
        accountName = parsedFields.employer || "Unmapped Account";
      }
      if (!institution) {
        institution = doc.documentType === "PAYSLIP" && parsedFields.employer
          ? "SARS / Employer"
          : "Unmapped Institution";
      }

      // Formulate clear, descriptive document name
      if (parsedFields.employer || doc.documentType === "PAYSLIP") {
        const emp = parsedFields.employer || "Unmapped Employer";
        documentName = `${emp} — Payslip / IRP5`;
      } else if (doc.documentType === "MUNICIPAL_BILL") {
        documentName = `${institution} — ${accountName}`;
      } else if (doc.documentType === "INVOICE") {
        documentName = `${institution} — ${accountName}`;
      } else {
        documentName = `${institution} — ${accountName}`;
      }

      // Exclude heavy raw text blob from list response to keep JSON payload lightweight
      const { parsedData: _fullParsed, ...docBase } = doc;

      return {
        ...docBase,
        documentName,
        institution,
        accountName,
        accountNumber: accountNumber || "",
      };
    });

    return NextResponse.json(enriched);
  } catch (error: any) {
    console.error("GET /api/documents error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
