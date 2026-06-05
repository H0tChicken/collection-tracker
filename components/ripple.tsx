"use client";

import { useEffect, useRef, useState } from "react";

interface RippleSpec {
  key: number;
  x: number;
  y: number;
  size: number;
}

/**
 * MD3 ripple / pressed-state layer. Drop this as the LAST child of any
 * positioned, clickable element (button, link, chip). It attaches a pointerdown
 * listener to its parent, forces the parent to clip (overflow:hidden) and
 * position:relative, and renders an expanding translucent circle from the press
 * point — Material's touch-ripple. Uses currentColor so it tints to whatever the
 * host's text color is.
 */
export function Ripple() {
  const anchor = useRef<HTMLSpanElement>(null);
  const [ripples, setRipples] = useState<RippleSpec[]>([]);
  const seq = useRef(0);

  useEffect(() => {
    const parent = anchor.current?.parentElement;
    if (!parent) return;

    // Ensure the host clips the ripple and positions it.
    const cs = getComputedStyle(parent);
    if (cs.position === "static") parent.style.position = "relative";
    parent.style.overflow = "hidden";

    function onDown(e: PointerEvent) {
      const rect = parent!.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      const key = seq.current++;
      setRipples((r) => [...r, { key, x, y, size }]);
      // Remove after the animation completes.
      window.setTimeout(() => {
        setRipples((r) => r.filter((rp) => rp.key !== key));
      }, 600);
    }

    parent.addEventListener("pointerdown", onDown);
    return () => parent.removeEventListener("pointerdown", onDown);
  }, []);

  return (
    <span
      ref={anchor}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {ripples.map((r) => (
        <span
          key={r.key}
          className="md-ripple absolute rounded-full bg-current"
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
        />
      ))}
    </span>
  );
}
