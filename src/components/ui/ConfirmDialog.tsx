"use client";

import { AlertTriangle, X, Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  loading = false,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] backdrop-blur-sm p-4">
      <div className="bg-[var(--bg-panel)] rounded-2xl shadow-2xl w-full max-w-md border border-[#e2e8f0]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#e2e8f0]">
          {variant === "danger" && (
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--status-danger)]/10 flex-shrink-0">
              <AlertTriangle size={20} className="text-[var(--status-danger)]" />
            </div>
          )}
          <h3 className="text-[var(--text-primary)] font-bold text-lg">{title}</h3>
          <button
            onClick={onCancel}
            className="ml-auto w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[var(--bg-panel-soft)] flex items-center justify-end gap-3 border-t border-[#e2e8f0] rounded-b-2xl">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-2.5 border border-[var(--border-default)] text-[var(--text-secondary)] text-sm font-semibold rounded-full hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-6 py-2.5 text-white text-sm font-semibold rounded-full transition-colors disabled:opacity-50 flex items-center gap-2 ${
              variant === "danger"
                ? "bg-[var(--status-danger)] hover:bg-red-700"
                : "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"
            }`}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
