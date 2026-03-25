"use client";

import { useRef, useState } from "react";
import { Download, Upload, Loader2, CheckCircle2, AlertCircle, X, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

export interface ColDef {
  /** chave interna do objeto */
  key: string;
  /** cabeçalho que aparece na planilha */
  header: string;
  /** instrução que aparece na linha 2 da planilha */
  instrucao?: string;
  /** valor de exemplo que aparece na linha 3 */
  exemplo?: string;
  obrigatorio?: boolean;
}

export interface ImportResult {
  success: number;
  errors: string[];
}

interface Props {
  cols: ColDef[];
  /** nome do arquivo sem extensão */
  nomeTemplate: string;
  /** recebe as linhas parseadas e deve retornar { success, errors } */
  onImport: (rows: Record<string, string>[]) => Promise<ImportResult>;
}

export function ImportExportXlsx({ cols, nomeTemplate, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  /* ── Download template ─────────────────────────────────────────────── */
  function downloadTemplate() {
    const wb = XLSX.utils.book_new();

    // Linha 1: cabeçalhos
    // Linha 2: instruções
    // Linha 3: exemplo
    const aoa: string[][] = [
      cols.map(c => c.header),
      cols.map(c => c.instrucao ?? ""),
      cols.map(c => c.exemplo ?? ""),
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Largura automática por coluna
    ws["!cols"] = cols.map(() => ({ wch: 28 }));

    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${nomeTemplate}.xlsx`);
  }

  /* ── Import ─────────────────────────────────────────────────────────── */
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];

      // Lê a partir da linha 2 (pula a linha de instruções / linha 1 = cabeçalho, linha 2 = instrução)
      // sheet_to_json usa a primeira linha como keys; se o arquivo tiver linha de instrução
      // ela vira uma "linha de dados" — por isso pulamos linhas onde TODOS os valores batem
      // com as instruções declaradas (ou estão em branco).
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

      const instrucoes = new Set(cols.map(c => c.instrucao).filter(Boolean));

      const rows: Record<string, string>[] = raw
        // remove a linha de instruções (se o usuário não apagou)
        .filter(row => {
          const vals = Object.values(row).map(v => String(v).trim());
          const primeiroCampo = vals[0] ?? "";
          return !instrucoes.has(primeiroCampo) && primeiroCampo !== "";
        })
        // mapeia cabeçalho → key
        .map(row => {
          const mapped: Record<string, string> = {};
          cols.forEach(col => {
            mapped[col.key] = String(row[col.header] ?? "").trim();
          });
          return mapped;
        });

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
      {/* Baixar Template */}
      <button
        onClick={downloadTemplate}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
        style={{
          background: "#F4F5F7",
          border: "1px solid #EBEBEC",
          color: "#4B5FBF",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "#EEF1FB")}
        onMouseLeave={e => (e.currentTarget.style.background = "#F4F5F7")}
        title="Baixar planilha modelo com as colunas corretas"
      >
        <Download size={14} />
        Baixar Template
      </button>

      {/* Importar */}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={importing}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
        style={{
          background: "#EEF1FB",
          border: "1px solid #C7CEED",
          color: "#4B5FBF",
          whiteSpace: "nowrap",
          opacity: importing ? 0.7 : 1,
          cursor: importing ? "not-allowed" : "pointer",
        }}
        onMouseEnter={e => { if (!importing) (e.currentTarget.style.background = "#E0E5F8"); }}
        onMouseLeave={e => { if (!importing) (e.currentTarget.style.background = "#EEF1FB"); }}
        title="Importar dados a partir de uma planilha Excel"
      >
        {importing
          ? <Loader2 size={14} className="animate-spin" />
          : <FileSpreadsheet size={14} />}
        Importar Excel
      </button>

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFile}
        className="hidden"
      />

      {/* Resultado */}
      {result && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
          style={{
            background: isOk ? "#DCFCE7" : "#FEE2E2",
            border: `1px solid ${isOk ? "#86EFAC" : "#FCA5A5"}`,
            color: isOk ? "#166534" : "#DC2626",
            maxWidth: 320,
          }}
        >
          {isOk ? <CheckCircle2 size={14} className="flex-shrink-0" /> : <AlertCircle size={14} className="flex-shrink-0" />}
          <span className="truncate">
            {isOk
              ? `${result.success} registro(s) importado(s) com sucesso`
              : result.errors[0]}
          </span>
          <button
            onClick={() => setResult(null)}
            className="ml-1 flex-shrink-0 opacity-60 hover:opacity-100"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
