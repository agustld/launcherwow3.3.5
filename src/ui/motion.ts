/** Utilidades para prefers-reduced-motion. */

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Duración de pasos visuales del flujo JUGAR (0 si reduced motion). */
export function motionDelayMs(normalMs: number): number {
  return prefersReducedMotion() ? 0 : normalMs;
}
