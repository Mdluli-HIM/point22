"use client";

import { useEffect } from "react";

export default function TimelineScrollGuard() {
  useEffect(() => {
    function preventHistorySwipe(event: WheelEvent) {
      if (event.ctrlKey) return;

      // Prevent browser history navigation caused
      // by horizontal trackpad overscroll.
      //
      // Do not stop propagation: Embla's existing
      // wheel handler still receives the event.
      if (
        Math.abs(event.deltaX) > 0 &&
        event.cancelable
      ) {
        event.preventDefault();
      }
    }

    window.addEventListener(
      "wheel",
      preventHistorySwipe,
      {
        capture: true,
        passive: false,
      }
    );

    return () => {
      window.removeEventListener(
        "wheel",
        preventHistorySwipe,
        true
      );
    };
  }, []);

  return null;
}
