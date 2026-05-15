"use client";

import { useState, useRef, useEffect, useCallback, useMemo, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

interface CustomMultiSelectProps {
  options: SelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  position?: "top" | "bottom";
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function CustomMultiSelect({
  options,
  values,
  onChange,
  placeholder = "Selecione",
  disabled = false,
  className = "",
  position = "bottom",
}: CustomMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedSet = useMemo(() => new Set(values), [values]);
  const estimatedMenuHeight = useMemo(() => Math.min(280, options.length * 44 + 12), [options.length]);

  const selectedText = useMemo(() => {
    const selectedOptions = options.filter((option) => selectedSet.has(option.value));
    if (selectedOptions.length === 0) {
      return placeholder;
    }
    if (selectedOptions.length === 1) {
      return selectedOptions[0]?.label ?? placeholder;
    }
    return `${selectedOptions.length} selecionados`;
  }, [options, placeholder, selectedSet]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportPadding = 8;
    const margin = 4;
    const menuHeight = menuRef.current?.offsetHeight ?? estimatedMenuHeight;
    const menuWidth = rect.width;

    let top = position === "top" ? rect.top - menuHeight - margin : rect.bottom + margin;
    let left = rect.left;

    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - menuWidth - viewportPadding));
    top = Math.max(viewportPadding, Math.min(top, window.innerHeight - menuHeight - viewportPadding));

    setMenuStyle({
      position: "fixed",
      top,
      left,
      width: menuWidth,
      zIndex: 10000,
    });
  }, [estimatedMenuHeight, position]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isInsideTrigger = rootRef.current?.contains(target);
      const isInsideMenu = menuRef.current?.contains(target);
      if (!isInsideTrigger && !isInsideMenu) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;

    updateMenuPosition();
    const handleViewportChange = () => updateMenuPosition();

    window.addEventListener("resize", handleViewportChange, { passive: true });
    window.addEventListener("scroll", handleViewportChange, { passive: true });

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange);
    };
  }, [open, updateMenuPosition]);

  const toggleValue = (value: string) => {
    if (selectedSet.has(value)) {
      onChange(values.filter((item) => item !== value));
      return;
    }
    onChange(unique([...values, value]));
  };

  return (
    <div ref={rootRef} className={`relative w-full ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`
          flex w-full items-center justify-between
          px-5 py-2.5
          bg-[var(--bg-input)] border border-transparent rounded-full
          text-sm text-[var(--text-primary)]
          focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          ${open ? "ring-2 ring-[var(--brand-primary)] border-transparent" : ""}
        `}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={values.length > 0 ? "truncate" : "text-[var(--text-muted)] truncate"}>
          {selectedText}
        </span>
        <ChevronDown
          className={`
            h-4 w-4 text-[var(--text-muted)] transition-transform duration-200 flex-shrink-0 ml-2
            ${open ? "rotate-180" : ""}
          `}
        />
      </button>

      {open && mounted && menuStyle && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          style={menuStyle}
          className="
            max-h-72 overflow-y-auto
            bg-[var(--bg-input)] rounded-xl
            border border-[var(--border-default)]
            shadow-lg
            p-1
          "
        >
          {options.map((option) => {
            const checked = selectedSet.has(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleValue(option.value)}
                className={`
                  w-full relative flex items-center gap-3
                  rounded-lg px-4 py-2.5 text-sm outline-none text-left
                  transition-colors
                  hover:bg-[var(--bg-hover)] hover:text-[var(--brand-primary)]
                  ${checked ? "bg-[var(--bg-hover)] font-semibold text-[var(--brand-primary)]" : "text-[var(--text-primary)]"}
                `}
              >
                <span
                  className={`
                    flex items-center justify-center
                    w-4 h-4 rounded border flex-shrink-0
                    ${checked ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/15" : "border-[var(--border-default)]"}
                  `}
                >
                  {checked && <Check className="h-3 w-3 text-[var(--brand-primary)]" />}
                </span>
                <span className="flex-1 truncate">{option.label}</span>
              </button>
            );
          })}

          {options.length === 0 && (
            <div className="px-4 py-3 text-sm text-[var(--text-muted)] text-center">
              Nenhuma opção disponível
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
