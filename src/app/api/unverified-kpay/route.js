import { NextResponse } from "next/server";
import { databaseErrorResponse, ensureDatabase } from "@/lib/database";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await ensureDatabase();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "PENDING";

    const items = await prisma.unverifiedKpay.findMany({
      where: { status },
      include: {
        suggestedCustomer: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: items });
  } catch (error) {
    return NextResponse.json(databaseErrorResponse(error), { status: 500 });
  }
}
