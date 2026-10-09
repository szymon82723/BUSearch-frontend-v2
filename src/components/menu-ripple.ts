export function showMenuRipple(control: HTMLElement, event?: PointerEvent): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const rect = control.getBoundingClientRect();
  const x = event ? event.clientX - rect.left : rect.width / 2;
  const y = event ? event.clientY - rect.top : rect.height / 2;
  const size = 2 * Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y));
  const ripple = document.createElement("span");
  ripple.className = "ui-menu-ripple";
  ripple.setAttribute("aria-hidden", "true");
  Object.assign(ripple.style, { width: `${size}px`, height: `${size}px`, left: `${x - size / 2}px`, top: `${y - size / 2}px` });
  control.append(ripple);
  const animation = ripple.animate([
    { transform: "scale(0)", opacity: 0.18 },
    { transform: "scale(1)", opacity: 0 },
  ], { duration: 420, easing: "cubic-bezier(0.2, 0, 0, 1)" });
  animation.onfinish = () => ripple.remove();
  animation.oncancel = () => ripple.remove();
}
