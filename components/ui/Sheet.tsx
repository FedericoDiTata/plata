"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useIsDesktop } from "@/lib/useIsDesktop";

/**
 * Panel modal. En celular sube desde abajo (bottom sheet, con arrastre para
 * cerrar). En compu aparece como ventana centrada. El fondo se oscurece.
 */
export function Sheet({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          {isDesktop ? (
            /* ---- Compu: ventana centrada ---- */
            <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-auto max-h-[88vh] w-full max-w-[460px] overflow-y-auto rounded-3xl border border-line bg-surface"
              >
                <div className="sticky top-0 z-10 flex items-center justify-between bg-surface px-5 pb-2 pt-4">
                  <h2 className="text-base font-semibold">{title ?? ""}</h2>
                  <button
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition hover:bg-surface-2"
                    aria-label="Cerrar"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>
                <div className="px-5 pb-6 pt-2">{children}</div>
              </motion.div>
            </div>
          ) : (
            /* ---- Celular: cajón desde abajo ---- */
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 120) onClose();
              }}
              className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[92dvh] w-full max-w-[520px] overflow-y-auto rounded-t-3xl border border-line bg-surface safe-bottom"
            >
              <div className="sticky top-0 z-10 flex flex-col items-center bg-surface pt-3">
                <div className="h-1.5 w-10 rounded-full bg-line-strong" />
                {title && (
                  <h2 className="mb-1 mt-3 text-base font-semibold">{title}</h2>
                )}
              </div>
              <div className="px-5 pb-6 pt-2">{children}</div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
