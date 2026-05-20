import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { ensureDatabase, databaseErrorResponse } from "@/lib/database";
import { extractKpayAmount, buildKpayRawText } from "@/lib/kpay";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    await ensureDatabase();
    
    const data = await request.json();
    const rawText = buildKpayRawText(data.title, data.text);
    
    if (!rawText) {
      return NextResponse.json({ success: false, error: "No text provided" }, { status: 400 });
    }

    const amount = extractKpayAmount(rawText);

    const newKpayLog = await prisma.unverifiedKpay.create({
      data: {
        raw_text: rawText,
        amount: amount,
        status: "PENDING"
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Data synced successfully", 
      extracted_amount: amount,
      id: newKpayLog.id
    });
  } catch (error) {
    return NextResponse.json(databaseErrorResponse(error), { status: 500 });
  }
}
