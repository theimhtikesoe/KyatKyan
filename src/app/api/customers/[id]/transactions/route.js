import { NextResponse } from "next/server";
import { databaseErrorResponse, ensureDatabase } from "@/lib/database";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function balanceDelta(type, amount) {
  return type === "CREDIT" ? amount : -amount;
}

export async function POST(request, { params }) {
  try {
    await ensureDatabase();

    const customerId = params.id;
    const body = await request.json();
    const type = body.type === "DEBIT" ? "DEBIT" : "CREDIT";
    const amount = Math.round(Number(body.amount || 0));
    const deductions = Math.round(Number(body.deductions || 0));

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "amount must be greater than zero" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.update({
        where: { id: customerId },
        data: {
          current_balance: {
            increment: balanceDelta(type, amount),
          },
        },
        select: {
          id: true,
          name: true,
          phone: true,
          routeTag: true,
          current_balance: true,
          createdAt: true,
        },
      });

      const ledger = await tx.ledger.create({
        data: {
          customerId,
          type,
          saleType: body.saleType || "RETAIL",
          itemSize: body.itemSize?.trim() || null,
          cartons: body.cartons ? Math.round(Number(body.cartons)) : null,
          rate: body.rate ? Math.round(Number(body.rate)) : null,
          deductions,
          amount,
          note: body.note?.trim() || null,
          paymentType: body.paymentType || null,
          date: body.date ? new Date(body.date) : new Date(),
        },
        select: {
          id: true,
          date: true,
          type: true,
          saleType: true,
          itemSize: true,
          cartons: true,
          rate: true,
          deductions: true,
          amount: true,
          note: true,
          paymentType: true,
        },
      });

      return { customer, ledger };
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(databaseErrorResponse(error), { status: 500 });
  }
}
