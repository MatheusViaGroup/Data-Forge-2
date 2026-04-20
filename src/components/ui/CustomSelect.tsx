"use client";

import { useState, useRef, useEffect, useCallback, useMemo, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Quando true, o dropdown abre para cima */
  position?: "top" | "bottom";
}

export function CustomSelect({
  options,
  value,
  onValueChange,
  placeholder = "— Selecione —",
  disabled = false,
  className = "",
  position = "bottom",
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);
  const estimatedMenuHeight = useMemo(() => Math.min(240, options.length * 44 + 8), [options.length]);

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

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
    }
  }, []);

  const handleSelect = (optionValue: string) => {
    onValueChange?.(optionValue);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative w-full ${className}`} onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`
          flex w-full items-center justify-between
          px-5 py-2.5
          bg-[#F0F4F8] border border-transparent rounded-full
          text-sm text-[#333333]
          focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          ${open ? "ring-2 ring-[#4B5FBF] border-transparent" : ""}
        `}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? "" : "text-[#94A3B8]"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`
            h-4 w-4 text-[#94A3B8] transition-transform duration-200 flex-shrink-0 ml-2
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
            max-h-60 overflow-y-auto
            bg-white rounded-xl
            border border-[#E2E8F0]
            shadow-lg
            p-1
          "
        >
          {options.map((option) => (
            <div
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              onClick={() => handleSelect(option.value)}
              className={`
                relative flex cursor-pointer select-none items-center
                rounded-lg px-4 py-2.5 text-sm outline-none
                transition-colors
                hover:bg-[#EEF1FB] hover:text-[#4B5FBF]
                ${option.value === value ? "bg-[#EEF1FB] font-semibold text-[#4B5FBF]" : "text-[#333333]"}
              `}
            >
              <span className="flex-1 truncate">{option.label}</span>
              {option.value === value && (
                <Check className="h-4 w-4 text-[#4B5FBF] flex-shrink-0 ml-2" />
              )}
            </div>
          ))}

          {options.length === 0 && (
            <div className="px-4 py-3 text-sm text-[#94A3B8] text-center">
              Nenhuma opção disponível
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
