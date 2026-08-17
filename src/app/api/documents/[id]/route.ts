import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const documentId = resolvedParams.id;

    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        embeddings: { select: { id: true, contentChunk: true } },
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    let linkedAccount: { name: string; institution: string } | null = null;

    if (doc.relatedEntityId) {
      if (doc.relatedEntityType === "ACCOUNT") {
        const acc = await prisma.account.findFirst({
          where: { id: doc.relatedEntityId, userId },
          select: { name: true, institution: true },
        });
        if (acc) linkedAccount = acc;
      } else if (doc.relatedEntityType === "DEBT") {
        const debt = await prisma.debt.findFirst({
          where: { id: doc.relatedEntityId, account: { userId } },
          include: { account: { select: { name: true, institution: true } } },
        });
        if (debt?.account) linkedAccount = debt.account;
      } else if (doc.relatedEntityType === "INCOME") {
        const inc = await prisma.income.findFirst({
          where: { id: doc.relatedEntityId, userId },
          select: { sourceName: true },
        });
        if (inc) linkedAccount = { name: inc.sourceName, institution: "Income Source" };
      } else if (doc.relatedEntityType === "ASSET") {
        const asset = await prisma.asset.findFirst({
          where: { id: doc.relatedEntityId, userId },
          select: { name: true, type: true },
        });
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

    const doc = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
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

    const doc = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
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
