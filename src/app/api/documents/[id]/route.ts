import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";
import { executeDocumentSyncPipeline } from "@/services/documentSyncPipeline";
import { getUserEntityScope, isEntityOwnedByUser } from "@/lib/userEntityScope";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const documentId = resolvedParams.id;

    const scope = await getUserEntityScope(userId);

    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        embeddings: { select: { id: true, contentChunk: true } },
      },
    });

    if (!doc || !isEntityOwnedByUser(doc.relatedEntityId, scope)) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    let linkedAccount: { name: string; institution: string } | null = null;

    if (doc.relatedEntityId) {
      if (doc.relatedEntityType === "ACCOUNT") {
        const acc = scope.accountMap.get(doc.relatedEntityId);
        if (acc) linkedAccount = { name: acc.name, institution: acc.institution };
      } else if (doc.relatedEntityType === "DEBT") {
        const debt = scope.debtMap.get(doc.relatedEntityId);
        if (debt?.account) linkedAccount = { name: debt.account.name, institution: debt.account.institution };
      } else if (doc.relatedEntityType === "INCOME") {
        const inc = scope.incomeMap.get(doc.relatedEntityId);
        if (inc) linkedAccount = { name: inc.sourceName, institution: "Income Source" };
      } else if (doc.relatedEntityType === "ASSET") {
        const asset = scope.assetMap.get(doc.relatedEntityId);
        if (asset) linkedAccount = { name: asset.name, institution: asset.type };
      }
    }

    const parsedData = (doc.parsedData as any) || {};
    const rawText = parsedData.rawText || parsedData.fullText || doc.embeddings.map((e) => e.contentChunk).join("\n\n");

    return NextResponse.json({
      ...doc,
      linkedAccount,
      rawText,
      parsedFields: parsedData.parsedFields || parsedData,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const documentId = resolvedParams.id;
    const body = await req.json().catch(() => ({}));
    const newStatus = body.status || "APPLIED";

    const scope = await getUserEntityScope(userId);

    const doc = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!doc || !isEntityOwnedByUser(doc.relatedEntityId, scope)) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const updatedDoc = await prisma.document.update({
      where: { id: documentId },
      data: {
        parseStatus: newStatus as any,
      },
    });

    // If status is APPLIED, synchronize financial records
    if (newStatus === "APPLIED") {
      const parsedData = (doc.parsedData as any) || {};
      const parsedFields = parsedData.parsedFields || parsedData;

      if (doc.documentType === "PAYSLIP") {
        const nettPay = parsedFields.nettPay || parsedFields.basicSalary;
        const employer = parsedFields.employer || "SARS Employer Salary";
        const taxNumber = parsedFields.taxNumber;
        const jobTitle = parsedFields.jobTitle;

        if (nettPay) {
          const existingIncome = await prisma.income.findFirst({
            where: { userId },
          });

          if (existingIncome) {
            await prisma.income.update({
              where: { id: existingIncome.id },
              data: {
                recurringAmount: nettPay,
                recurringAmountConfidence: "CONFIRMED",
                lastConfirmedDate: new Date(),
              },
            });
          } else {
            await prisma.income.create({
              data: {
                userId,
                sourceName: employer,
                recurringAmount: nettPay,
                recurringAmountConfidence: "CONFIRMED",
                payDayOfMonth: 15,
                lastConfirmedDate: new Date(),
              },
            });
          }
        }

        if (taxNumber || (jobTitle && jobTitle !== "Hire Date") || employer) {
          const existingProfile = await prisma.userProfile.findUnique({ where: { userId } });
          if (existingProfile) {
            await prisma.userProfile.update({
              where: { userId },
              data: {
                ...(taxNumber ? { taxReference: taxNumber } : {}),
                ...(jobTitle && jobTitle !== "Hire Date" ? { jobTitle } : {}),
                ...(employer ? { employerName: employer } : {}),
              },
            });
          }
        }
      }

      const rawText = parsedData.rawText || parsedData.fullText || "";
      await executeDocumentSyncPipeline(userId, documentId, rawText, doc.documentType, parsedFields);
    }

    return NextResponse.json({ success: true, document: updatedDoc });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const documentId = resolvedParams.id;

    const scope = await getUserEntityScope(userId);

    const doc = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!doc || !isEntityOwnedByUser(doc.relatedEntityId, scope)) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await prisma.document.delete({
      where: { id: documentId },
    });

    return NextResponse.json({ success: true, deletedId: documentId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
