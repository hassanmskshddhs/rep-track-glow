import { useEffect, useRef } from "react";

/**
 * App-wide Android hardware back stack (LIFO). Screens register a handler while
 * a sub-view/modal is open; App runs the top handler on hardware back, and falls
 * back to its own navigation (logger -> tabs -> exit) when the stack is empty.
 */
const handlers: (() => boolean)[] = [];

export function registerBackHandler(fn: () => boolean): () => void {
  handlers.push(fn);
  return () => {
    const i = handlers.indexOf(fn);
    if (i >= 0) handlers.splice(i, 1);
  };
}

export function runTopBackHandler(): boolean {
  const top = handlers[handlers.length - 1];
  return top ? top() : false;
}

/** While `active` is true, hardware back runs `onBack` instead of navigating up. */
export function useBackHandler(active: boolean, onBack: () => boolean): void {
  const ref = useRef(onBack);
  ref.current = onBack;
  useEffect(() => {
    if (!active) return;
    return registerBackHandler(() => ref.current());
  }, [active]);
}
