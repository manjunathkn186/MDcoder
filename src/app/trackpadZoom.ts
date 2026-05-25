import { useEffect } from "react";
import { useUi, ZOOM_MIN, ZOOM_MAX } from "@state/ui.store";

/**
 * macOS trackpad pinch-to-zoom for the document area.
 *
 * Browsers (WKWebView included) translate trackpad pinch gestures into
 * `wheel` events whose `ctrlKey` flag is synthetically set. We intercept
 * those events, prevent the default browser zoom, and drive our own
 * `useUi().setZoom` so the same multiplier the keyboard shortcuts and
 * dropdown use is updated.
 *
 * Safari/WebKit also exposes the legacy `gesturechange` event with a
 * `scale` field; we handle that as a fallback for older WKWebView.
 *
 * Wheel events that don't carry `ctrlKey` (normal two-finger scroll) are
 * ignored so this listener never interferes with regular scrolling.
 */
const PINCH_SENSITIVITY = 0.01;

export function useTrackpadZoom(): void {
  useEffect(() => {
    const clamp = (z: number): number =>
      Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));

    const onWheel = (e: WheelEvent): void => {
      if (!e.ctrlKey) return; // not a pinch — leave scrolling alone
      e.preventDefault();
      const current = useUi.getState().zoom ?? 1;
      const next = clamp(current - e.deltaY * PINCH_SENSITIVITY);
      if (next !== current) useUi.getState().setZoom(next);
    };

    // Legacy WebKit gesture events. `e.scale` is a multiplier relative to
    // the gesture start, so we sample the previous scale to compute an
    // incremental delta.
    let baseScale = 1;
    let baseZoom = 1;
    const onGestureStart = (e: Event): void => {
      e.preventDefault();
      baseScale = 1;
      baseZoom = useUi.getState().zoom ?? 1;
    };
    const onGestureChange = (e: Event): void => {
      e.preventDefault();
      const scale = (e as unknown as { scale: number }).scale ?? baseScale;
      const next = clamp(baseZoom * scale);
      if (next !== useUi.getState().zoom) useUi.getState().setZoom(next);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("gesturestart", onGestureStart as EventListener);
    window.addEventListener("gesturechange", onGestureChange as EventListener);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("gesturestart", onGestureStart as EventListener);
      window.removeEventListener("gesturechange", onGestureChange as EventListener);
    };
  }, []);
}
