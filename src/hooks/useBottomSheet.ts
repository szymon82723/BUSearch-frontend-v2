import { useState, useRef, useEffect, useCallback } from "react";

const SHEET_MAX_VH = 0.6;
const SHEET_FLICK = 0.55; // px/ms
const SHEET_CLOSE_DRAG = 84; // px dragged below collapsed to dismiss
const SHEET_TAP_SLOP = 6;
const SHEET_OVERDRAG = 0.18;

function getSheetMaxHeight(): number {
  return Math.max(160, Math.min(window.innerHeight * SHEET_MAX_VH, window.innerHeight - 90));
}

function sheetSettleTo(panelEl: HTMLElement, targetPx: number, zachowajWysokosc?: boolean) {
  const el = panelEl as any;
  el.__sheetSettleCleanup?.();
  panelEl.classList.add("ui-routepanel--snapping");
  panelEl.style.height = `${Math.round(targetPx)}px`;

  let guard = 0;
  const done = (ev?: TransitionEvent) => {
    if (ev && (ev.target !== panelEl || ev.propertyName !== "height")) return;
    panelEl.removeEventListener("transitionend", done);
    clearTimeout(guard);
    el.__sheetSettleCleanup = null;
    panelEl.classList.remove("ui-routepanel--snapping");
    if (!zachowajWysokosc) panelEl.style.height = "";
    panelEl.style.removeProperty("--sheet-y");
  };

  el.__sheetSettleCleanup = () => {
    panelEl.removeEventListener("transitionend", done);
    clearTimeout(guard);
    panelEl.classList.remove("ui-routepanel--snapping");
    el.__sheetSettleCleanup = null;
  };

  guard = window.setTimeout(() => done(), 280);
  panelEl.addEventListener("transitionend", done);
}

interface UseBottomSheetOptions {
  isOpen: boolean;
  onClose: () => void;
  canExpand?: boolean;
  initialExpanded?: boolean;
}

export function useBottomSheet({
  isOpen,
  onClose,
  canExpand = true,
  initialExpanded = false,
}: UseBottomSheetOptions) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [openAttr, setOpenAttr] = useState("0");
  const panelRef = useRef<HTMLDivElement | null>(null);
  const headRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);
  const suppressPointerClickRef = useRef(false);

  // Smooth entrance animation
  useEffect(() => {
    if (isOpen) {
      // Start at 0 then animate to 1
      const raf = requestAnimationFrame(() => {
        setOpenAttr("1");
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setOpenAttr("0");
    }
  }, [isOpen]);

  const toggleExpanded = useCallback(() => {
    const panelEl = panelRef.current;
    if (!panelEl || !canExpand) return;

    const from = panelEl.offsetHeight;
    const nextExpanded = !isExpanded;

    panelEl.classList.add("ui-routepanel--measuring");
    panelEl.dataset.expanded = nextExpanded ? "1" : "0";
    panelEl.style.height = "";
    const to = Math.min(panelEl.offsetHeight, getSheetMaxHeight());

    panelEl.dataset.expanded = isExpanded ? "1" : "0";
    panelEl.style.height = `${from}px`;
    void panelEl.offsetHeight; // Reflow
    panelEl.classList.remove("ui-routepanel--measuring");

    setIsExpanded(nextExpanded);
    panelEl.dataset.expanded = nextExpanded ? "1" : "0";
    sheetSettleTo(panelEl, to, false);
  }, [isExpanded, canExpand]);

  useEffect(() => {
    const handle = handleRef.current;
    if (!isOpen || !handle) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggleExpanded(); }
    };
    handle.addEventListener("keydown", onKey);
    return () => handle.removeEventListener("keydown", onKey);
  }, [isOpen, toggleExpanded]);

  // Wire pointer drag gestures
  useEffect(() => {
    const panelEl = panelRef.current;
    const headEl = headRef.current;
    const handleEl = handleRef.current;
    if (!panelEl || !headEl) return;

    let dragging = false;
    let activePointerId: number | null = null;
    let savedHeight = "";
    let moved = false;
    let fromHandle = false;
    let startY = 0;
    let lastY = 0;
    let lastT = 0;
    let vel = 0;
    let hCollapsed = 0;
    let hExpanded = 0;
    let hStart = 0;
    let curH = 0;
    let offset = 0;
    let wasExpanded = isExpanded;

    const setHandleActive = (on: boolean) => {
      if (handleEl) handleEl.classList.toggle("ui-routepanel__handle--dragging", on);
    };

    const clearInline = () => {
      panelEl.style.height = "";
      panelEl.style.removeProperty("--sheet-y");
    };

    const measure = () => {
      wasExpanded = panelEl.dataset.expanded === "1";
      panelEl.classList.add("ui-routepanel--measuring");
      panelEl.style.height = "";
      panelEl.dataset.expanded = "0";
      hCollapsed = panelEl.offsetHeight;

      if (canExpand) {
        panelEl.dataset.expanded = "1";
        hExpanded = Math.min(panelEl.offsetHeight, getSheetMaxHeight());
      } else {
        hExpanded = hCollapsed;
        panelEl.dataset.expanded = wasExpanded ? "1" : "0";
      }
      if (hExpanded < hCollapsed) hExpanded = hCollapsed;
      panelEl.classList.remove("ui-routepanel--measuring");
    };

    const onDown = (e: PointerEvent) => {
      if (dragging) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (
        (e.target as HTMLElement).closest(
          "button, a, input, select, textarea, [role='button']:not(.ui-routepanel__handle)"
        )
      ) {
        return;
      }
      if (e.isPrimary === false) return;

      suppressPointerClickRef.current = false;
      dragging = true;
      activePointerId = e.pointerId;
      savedHeight = panelEl.style.height;
      moved = false;
      fromHandle = !!(handleEl && (e.target as HTMLElement).closest(".ui-routepanel__handle"));
      startY = lastY = e.clientY;
      lastT = performance.now();
      vel = 0;
      offset = 0;

      const hNow = panelEl.offsetHeight;
      (panelEl as any).__sheetSettleCleanup?.();
      measure();

      hStart = Math.min(hExpanded, Math.max(hCollapsed, hNow));
      curH = hStart;
      panelEl.dataset.dragging = "1";
      panelEl.style.height = `${curH}px`;
      setHandleActive(true);

      try {
        headEl.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture fails
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== activePointerId) return;
      const now = performance.now();
      vel = (e.clientY - lastY) / Math.max(1, now - lastT);
      lastY = e.clientY;
      lastT = now;
      const dy = e.clientY - startY;
      if (Math.abs(dy) > SHEET_TAP_SLOP) moved = true;

      let h = hStart - dy;
      if (h > hExpanded) h = hExpanded + (h - hExpanded) * SHEET_OVERDRAG;
      if (h < hCollapsed) {
        offset = hCollapsed - h;
        h = hCollapsed;
      } else {
        offset = 0;
      }
      curH = h;
      panelEl.style.height = `${h}px`;
      panelEl.style.setProperty("--sheet-y", `${offset}px`);
      if (e.cancelable) e.preventDefault();
    };

    const endDrag = (cancelled: boolean) => {
      if (!dragging) return;
      dragging = false;
      suppressPointerClickRef.current = moved || fromHandle;
      const pointerId = activePointerId;
      activePointerId = null;

      try {
        if (pointerId !== null && headEl.hasPointerCapture(pointerId)) {
          headEl.releasePointerCapture(pointerId);
        }
      } catch {
        // Ignore
      }

      panelEl.dataset.dragging = "0";
      setHandleActive(false);

      if (!moved || cancelled) {
        clearInline();
        panelEl.dataset.expanded = wasExpanded ? "1" : "0";
        panelEl.style.height = savedHeight;
        if (!moved && !cancelled && fromHandle) {
          toggleExpanded();
        }
        return;
      }

      if (offset > SHEET_CLOSE_DRAG || (offset > 16 && vel > SHEET_FLICK)) {
        clearInline();
        panelEl.dataset.expanded = "0";
        setIsExpanded(false);
        onClose();
        return;
      }

      const target = Math.min(hExpanded, Math.max(hCollapsed, curH));
      const collapseRange = Math.min(64, (hExpanded - hCollapsed) * 0.3);
      const isBottom = target <= hCollapsed + Math.max(2, collapseRange) || !canExpand;

      const willExpand = !isBottom;
      setIsExpanded(willExpand);
      panelEl.dataset.expanded = willExpand ? "1" : "0";
      panelEl.style.setProperty("--sheet-y", "0px");
      sheetSettleTo(panelEl, isBottom ? hCollapsed : target, willExpand);
    };

    // A pointer tap is handled on release. Suppress its subsequent click so
    // React's handle onClick cannot immediately undo the expansion.
    const onPointerClick = (event: MouseEvent) => {
      if (suppressPointerClickRef.current && event.detail > 0) {
        event.preventDefault();
        event.stopPropagation();
      }
      suppressPointerClickRef.current = false;
    };
    headEl.addEventListener("click", onPointerClick, true);
    headEl.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: false });
    const onUp = (e: PointerEvent) => {
      if (e.pointerId === activePointerId) endDrag(false);
    };
    const onCancel = (e: PointerEvent) => {
      if (e.pointerId === activePointerId) endDrag(true);
    };
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);

    return () => {
      headEl.removeEventListener("click", onPointerClick, true);
      headEl.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, [canExpand, isExpanded, onClose, toggleExpanded]);

  return {
    panelRef,
    headRef,
    handleRef,
    isExpanded,
    setIsExpanded,
    toggleExpanded,
    openAttr,
  };
}
