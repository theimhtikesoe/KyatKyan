import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function balanceDelta(type, amount) {
  return type === "DEBIT" ? amount : -amount;
}

export async function POST(request, { params }) {
  try {
    const customer_id = Number(params.id);
    const body = await request.json();
    const type = body.type === "CREDIT" ? "CREDIT" : "DEBIT";
    const amount = Math.round(Number(body.amount || 0));

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "amount must be greater than zero" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.update({
        where: { id: customer_id },
        data: {
          current_balance: {
            increment: balanceDelta(type, amount),
          },
        },
      });

      const transaction = await tx.ledgerTransaction.create({
        data: {
          customer_id,
          type,
          amount,
          note: body.note?.trim() || null,
          date: body.date ? new Date(body.date) : new Date(),
        },
      });

      return { customer, transaction };
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not create transaction" }, { status: 500 });
  }
}
