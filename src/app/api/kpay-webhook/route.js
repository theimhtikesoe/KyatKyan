import { NextResponse } from "next/server";
import { databaseErrorResponse, ensureDatabase } from "@/lib/database";
import { prisma } from "@/lib/prisma";
import { buildKpayRawText, extractKpayAmount } from "@/lib/kpay";
import { sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    await ensureDatabase();

    const body = await request.json();
    const title = body.title || "";
    const text = body.text || "";
    const raw_text = buildKpayRawText(title, text);
    const amount = extractKpayAmount(text || raw_text);

    if (!raw_text) {
      return NextResponse.json({ error: "title or text is required" }, { status: 400 });
    }

    if (!amount) {
      return NextResponse.json({ error: "Could not extract amount from text" }, { status: 400 });
    }

    const kpay = await prisma.unverifiedKpay.create({
      data: {
        raw_text,
        amount,
        status: "PENDING",
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const message = `🚨 KPay ငွေဝင်ပြီ - ပမာဏ: ${amount.toLocaleString()} ကျပ်။ စစ်ဆေးရန်: ${appUrl}`;

    try {
      await sendTelegramMessage(message);
    } catch (error) {
      console.error(error);
    }

    return NextResponse.json({ ok: true, data: kpay });
  } catch (error) {
    return NextResponse.json(databaseErrorResponse(error), { status: 500 });
  }
}
