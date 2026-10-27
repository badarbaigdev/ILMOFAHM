/**
 * Print a single DOM node as a clean one-page document.
 * Clones the node into a body-level sheet and hides everything else via
 * `display: none` (avoids the broken dialog `visibility` trick).
 */
export function printElement(element: HTMLElement, documentTitle?: string): void {
  const previousTitle = document.title;
  if (documentTitle) {
    document.title = documentTitle;
  }

  document.querySelector(".school-print-sheet")?.remove();
  document.body.classList.remove("school-printing");

  const sheet = document.createElement("div");
  sheet.className = "school-print-sheet";
  sheet.setAttribute("aria-hidden", "true");
  sheet.appendChild(element.cloneNode(true));
  document.body.appendChild(sheet);
  document.body.classList.add("school-printing");

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    document.body.classList.remove("school-printing");
    sheet.remove();
    document.title = previousTitle;
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  window.setTimeout(() => {
    window.print();
    // Fallback if afterprint is delayed or missing.
    window.setTimeout(cleanup, 1500);
  }, 50);
}
