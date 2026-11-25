import { useEffect, useRef, useState } from "react";

/**
 * Eases a displayed number toward its target (0 -> target on first render,
 * then from the last value on change). Respects prefers-reduced-motion.
 */
export function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const mountedRef = useRef(false);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = mountedRef.current ? fromRef.current : 0;
    mountedRef.current = true;
    if (reduce || from === target || !Number.isFinite(target)) {
      setValue(target);
      fromRef.current = target;
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(from + (target - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    fromRef.current = target;
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
