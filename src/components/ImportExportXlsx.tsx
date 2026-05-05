"use client";

import { useRef, useState } from "react";
import { Download, Loader2, CheckCircle2, AlertCircle, X, FileSpreadsheet } from "lucide-react";
import ExcelJS from "exceljs";

export interface ColDef {
  key: string;
  header: string;
  instrucao?: string;
  exemplo?: string;
  obrigatorio?: boolean;
}

export interface ImportResult {
  success: number;
  errors: string[];
}

interface Props {
  cols: ColDef[];
  nomeTemplate: string;
  onImport: (rows: Record<string, string>[]) => Promise<ImportResult>;
}

function triggerDownload(buffer: ArrayBuffer, fileName: string) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ImportExportXlsx({ cols, nomeTemplate, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function downloadTemplate() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Template");

    sheet.addRow(cols.map((c) => c.header));
    sheet.addRow(cols.map((c) => c.instrucao ?? ""));
    sheet.addRow(cols.map((c) => c.exemplo ?? ""));
    sheet.columns = cols.map(() => ({ width: 28 }));

    const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
    triggerDownload(buffer, `${nomeTemplate}.xlsx`);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.worksheets[0];

      if (!sheet) {
        setResult({ success: 0, errors: ["Nenhuma planilha encontrada no arquivo."] });
        return;
      }

      const headerRow = sheet.getRow(1);
      const headerToIndex = new Map<string, number>();

      headerRow.eachCell((cell, colNumber) => {
        const header = String(cell.value ?? "").trim();
        if (header) headerToIndex.set(header, colNumber);
      });

      const instrucoes = new Set(cols.map((c) => c.instrucao).filter(Boolean) as string[]);
      const rows: Record<string, string>[] = [];

      for (let i = 2; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);
        const mapped: Record<string, string> = {};

        cols.forEach((col) => {
          const colIndex = headerToIndex.get(col.header);
          const raw = colIndex ? row.getCell(colIndex).value : "";
          mapped[col.key] = String(raw ?? "").trim();
        });

        const values = Object.values(mapped);
        const firstField = values[0] ?? "";

        const hasAnyValue = values.some((v) => v !== "");
        if (!hasAnyValue) continue;

        if (instrucoes.has(firstField)) continue;

        rows.push(mapped);
      }

      if (rows.length === 0) {
        setResult({ success: 0, errors: ["Nenhuma linha de dados encontrada na planilha."] });
        return;
      }

      const res = await onImport(rows);
      setResult(res);
    } catch (err) {
      setResult({
        success: 0,
        errors: [`Erro ao ler arquivo: ${err instanceof Error ? err.message : "Erro desconhecido"}`],
      });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const isOk = result && result.errors.length === 0;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={downloadTemplate}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
        style={{
          background: "var(--bg-app)",
          border: "1px solid var(--border-soft)",
          color: "var(--brand-primary)",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-app)")}
        title="Baixar planilha modelo com as colunas corretas"
      >
        <Download size={14} />
        Baixar Template
      </button>

      <button
        onClick={() => fileRef.current?.click()}
        disabled={importing}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
        style={{
          background: "var(--bg-app)",
          border: "1px solid var(--border-soft)",
          color: "var(--brand-primary)",
          whiteSpace: "nowrap",
          opacity: importing ? 0.7 : 1,
          cursor: importing ? "not-allowed" : "pointer",
        }}
        onMouseEnter={(e) => {
          if (!importing) e.currentTarget.style.background = "#E0E5F8";
        }}
        onMouseLeave={(e) => {
          if (!importing) e.currentTarget.style.background = "var(--bg-hover)";
        }}
        title="Importar dados a partir de uma planilha Excel"
      >
        {importing ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
        Importar Excel
      </button>

      <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />

      {result && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
          style={{
            background: isOk ? "#DCFCE7" : "#FEE2E2",
            border: `1px solid ${isOk ? "#86EFAC" : "#FCA5A5"}`,
            color: isOk ? "#166534" : "var(--status-danger)",
            maxWidth: 320,
          }}
        >
          {isOk ? <CheckCircle2 size={14} className="flex-shrink-0" /> : <AlertCircle size={14} className="flex-shrink-0" />}
          <span className="truncate">
            {isOk ? `${result.success} registro(s) importado(s) com sucesso` : result.errors[0]}
          </span>
          <button onClick={() => setResult(null)} className="ml-1 flex-shrink-0 opacity-60 hover:opacity-100">
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
