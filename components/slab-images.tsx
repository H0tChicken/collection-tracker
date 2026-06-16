"use client";

import { useEffect, useState } from "react";

const CDN = "https://d39lwrz0lm7c9r.cloudfront.net/slab-images";

export function SlabImages({ certNumber }: { certNumber: string }) {
  const [open, setOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Close lightbox on Escape.
  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setLightbox(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox]);

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-label-md text-primary hover:underline"
      >
        {open ? "▲ Hide slab" : "▾ View slab"}
      </button>

      {open && (
        <div className="mt-2 flex flex-wrap gap-3">
          {(["FRONT", "BACK"] as const).map((side) => {
            const src = `${CDN}/${certNumber}_Slabbed_${side}.jpg`;
            return (
              <button
                key={side}
                type="button"
                onClick={() => setLightbox(src)}
                className="group relative"
              >
                <img
                  src={src}
                  alt={`${certNumber} ${side.toLowerCase()}`}
                  loading="lazy"
                  className="h-48 rounded-md object-contain shadow-md transition-opacity group-hover:opacity-80"
                />
                <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                    {side}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Slab full size"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
