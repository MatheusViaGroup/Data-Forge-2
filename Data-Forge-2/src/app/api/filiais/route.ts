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

  const res = await fetch("https://n8n.datastack.viagroup.com.br/webhook/filial", {
    next: { revalidate: 300 }, // cache 5 minutos
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Erro ao buscar filiais" }, { status: 502 });
  }

  const data: Filial[] = await res.json();

  const filiais = data
    .filter((f) => f.PLANTA_ID && f.PLANTA)
    .sort((a, b) => a.PLANTA.localeCompare(b.PLANTA));

  return NextResponse.json({ filiais });
}
