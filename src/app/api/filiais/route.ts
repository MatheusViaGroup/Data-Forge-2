import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export interface Filial {
  PLANTA_ID: string;
  PLANTA: string;
  COD_CENTRO_CUSTO: string | null;
  DATA_INICIO: string | null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  let response: Response;
  try {
    response = await fetch("https://n8n.datastack.viagroup.com.br/webhook/filial", {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[filiais] Erro ao consultar webhook:", err.message);
    return NextResponse.json({ filiais: [] }, { status: 502 });
  }

  if (!response.ok) {
    return NextResponse.json({ filiais: [] }, { status: 502 });
  }

  const data: Filial[] = await response.json();
  const filiais = data
    .filter((filial) => filial.PLANTA_ID && filial.PLANTA)
    .sort((a, b) => a.PLANTA.localeCompare(b.PLANTA));

  return NextResponse.json({ filiais });
}
