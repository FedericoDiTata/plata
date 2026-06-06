"use client";

import { useEffect, useState } from "react";

/**
 * Devuelve true cuando la pantalla es de escritorio (>= 1024px).
 * Lo usamos para mostrar el teclado numérico solo en celular y, en la compu,
 * un formulario normal + ventana centrada (en vez del cajón de abajo).
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isDesktop;
}
