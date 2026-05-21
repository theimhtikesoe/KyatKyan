import { NextResponse } from "next/server";
import { databaseErrorResponse, ensureDatabase } from "@/lib/database";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  try {
    await ensureDatabase();

    const id = params.id;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        kpayAliases: {
          orderBy: { kpayName: "asc" },
        },
        // Optimized: Limit ledger history to recent 50 entries for faster loading
        ledgers: {
          orderBy: { date: "desc" },
          take: 50,
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ data: customer });
  } catch (error) {
    return NextResponse.json(databaseErrorResponse(error), { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    await ensureDatabase();

    const id = params.id;
    const body = await request.json();

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.phone !== undefined ? { phone: body.phone?.trim() || null } : {}),
        ...(body.routeTag !== undefined ? { routeTag: body.routeTag?.trim() || null } : {}),
      },
    });

    return NextResponse.json({ data: customer });
  } catch (error) {
    return NextResponse.json(databaseErrorResponse(error), { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    await ensureDatabase();

    const id = params.id;

    if (!id) {
      return NextResponse.json({ error: "Customer id is required" }, { status: 400 });
    }

    const customer = await prisma.customer.delete({
      where: { id },
    });

    return NextResponse.json({ data: customer });
  } catch (error) {
    return NextResponse.json(databaseErrorResponse(error), { status: 500 });
  }
}
