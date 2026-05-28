import { useEffect, type RefObject } from "react";

export function useQuizPanelFit(
  panelRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const panel = panelRef.current;
    const shell = document.querySelector(".page-shell");
    if (!panel || !shell) {
      return;
    }

    let frame = 0;

    const fitPanel = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        panel.style.transform = "none";
        panel.style.marginBottom = "";

        if (window.matchMedia("(min-aspect-ratio: 1/1)").matches) {
          return;
        }

        const available = shell.clientHeight;
        const needed = panel.offsetHeight;
        if (needed <= available || needed === 0) {
          return;
        }

        const scale = available / needed;
        panel.style.transform = `scale(${scale})`;
        panel.style.transformOrigin = "top center";
        panel.style.marginBottom = `${needed * (scale - 1)}px`;
      });
    };

    const observer = new ResizeObserver(fitPanel);
    observer.observe(panel);
    observer.observe(shell);
    window.addEventListener("resize", fitPanel);
    fitPanel();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", fitPanel);
      panel.style.transform = "";
      panel.style.transformOrigin = "";
      panel.style.marginBottom = "";
    };
  }, [enabled, panelRef]);
}
