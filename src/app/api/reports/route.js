import { NextResponse } from "next/server";
import { databaseErrorResponse, ensureDatabase } from "@/lib/database";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await ensureDatabase();

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const baseDate = dateParam ? new Date(`${dateParam}T00:00:00`) : new Date();
    const start = new Date(baseDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    // Optimized: Only fetch what's needed for totals calculation
    const ledgers = await prisma.ledger.findMany({
      where: {
        date: {
          gte: start,
          lt: end,
        },
      },
      select: {
        id: true,
        type: true,
        saleType: true,
        amount: true,
        deductions: true,
        date: true,
        note: true,
      },
      orderBy: { date: "desc" },
    });

    // Optimized: Calculate totals in-memory without full customer joins
    const totals = ledgers.reduce(
      (summary, ledger) => {
        if (ledger.type === "CREDIT") {
          if (ledger.saleType === "WHOLESALE") {
            summary.wholesale += ledger.amount;
          } else {
            summary.retail += ledger.amount;
          }
          summary.deductions += ledger.deductions || 0;
        } else {
          summary.payments += ledger.amount;
        }
        return summary;
      },
      { retail: 0, wholesale: 0, deductions: 0, payments: 0 },
    );

    return NextResponse.json({
      data: {
        date: start.toISOString().slice(0, 10),
        totals: {
          ...totals,
          grossSales: totals.retail + totals.wholesale,
          netSales: totals.retail + totals.wholesale - totals.deductions,
        },
        ledgerCount: ledgers.length,
      },
    });
  } catch (error) {
    return NextResponse.json(databaseErrorResponse(error), { status: 500 });
  }
}
