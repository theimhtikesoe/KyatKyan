import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "PENDING";

  const items = await prisma.unverifiedKpay.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: items });
}
