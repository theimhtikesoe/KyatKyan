import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request) {
  try {
    const body = await request.json();
    const unverifiedKpayId = Number(body.unverifiedKpayId);
    const customerId = Number(body.customerId);

    if (!unverifiedKpayId || !customerId) {
      return NextResponse.json(
        { error: "unverifiedKpayId and customerId are required" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const kpay = await tx.unverifiedKpay.findUnique({
        where: { id: unverifiedKpayId },
      });

      if (!kpay || kpay.status !== "PENDING") {
        throw new Error("KPay item is not pending");
      }

      const customer = await tx.customer.update({
        where: { id: customerId },
        data: {
          current_balance: {
            decrement: kpay.amount,
          },
        },
      });

      const transaction = await tx.ledgerTransaction.create({
        data: {
          customer_id: customerId,
          type: "CREDIT",
          amount: kpay.amount,
          note: `Matched KPay #${kpay.id}`,
          date: kpay.createdAt,
        },
      });

      const matched = await tx.unverifiedKpay.update({
        where: { id: unverifiedKpayId },
        data: { status: "MATCHED" },
      });

      return { customer, transaction, kpay: matched };
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Could not match KPay" }, { status: 500 });
  }
}
