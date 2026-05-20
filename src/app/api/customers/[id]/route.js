import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request, { params }) {
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
}

export async function PATCH(request, { params }) {
  try {
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
    console.error(error);
    return NextResponse.json({ error: "Could not update customer" }, { status: 500 });
  }
}
