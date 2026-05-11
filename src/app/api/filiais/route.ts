import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  try {
    const result = await query<{ planta: string }>(
      `SELECT planta FROM via_core.plantas ORDER BY planta`
    );
    const filiais = result.rows.map((r) => ({
      PLANTA: r.planta,
    }));
    return NextResponse.json({ filiais });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[filiais] Erro ao consultar plantas:", err.message);
    return NextResponse.json({ filiais: [] }, { status: 502 });
  }
}