"use client";

import { useState, useEffect, RefObject } from "react";

interface FloatingPosition {
  vertical: "top" | "bottom";
  horizontal: "left" | "right";
}

/**
 * Hook que calcula a melhor posição para elementos flutuantes (dropdowns, calendários).
 * Faz flip automático quando não há espaço suficiente abaixo.
 *
 * @param triggerRef - Referência ao elemento que dispara o dropdown
 * @param isOpen - Se o dropdown está aberto
 * @param dropdownHeight - Altura estimada do conteúdo (padrão: 240px)
 */
export function useFloatingPosition(
  triggerRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  dropdownHeight = 240
): FloatingPosition {
  const [position, setPosition] = useState<FloatingPosition>({
    vertical: "bottom",
    horizontal: "left",
  });

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const spaceRight = viewportWidth - rect.left;

      // Flip vertical: abre para cima se não houver espaço abaixo
      const vertical: "top" | "bottom" =
        spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove
          ? "bottom"
          : "top";

      // Flip horizontal: alinha à direita se não houver espaço à esquerda
      const horizontal: "left" | "right" = spaceRight >= 200 ? "left" : "right";

      setPosition({ vertical, horizontal });
    };

    updatePosition();

    // Recalcular em scroll e resize
    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition, { passive: true });

    return () => {
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, triggerRef, dropdownHeight]);

  return position;
}
