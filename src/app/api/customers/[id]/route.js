import { NextResponse } from "next/server";
import { databaseErrorResponse, ensureDatabase } from "@/lib/database";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  try {
    await ensureDatabase();

    const id = Number(params.id);

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { date: "desc" },
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

    const id = Number(params.id);
    const body = await request.json();

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.phone !== undefined ? { phone: body.phone?.trim() || null } : {}),
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

    const id = Number(params.id);

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
