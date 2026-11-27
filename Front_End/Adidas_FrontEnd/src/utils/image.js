// Responsive images for photos hosted on Pexels / Unsplash.
// Both CDNs resize on the fly with a `w` (width) query parameter, so we can let
// the browser pick a size that matches the screen via `srcSet` + `sizes`.
// Smaller images = less to download and decode while scrolling on a phone.

const RESIZABLE_HOSTS = ["images.pexels.com", "images.unsplash.com"];

function isResizable(url) {
  try {
    return RESIZABLE_HOSTS.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function resizeImage(url, width) {
  if (!url || !isResizable(url)) return url;
  const resized = new URL(url);
  resized.searchParams.set("w", String(width));
  resized.searchParams.delete("h");
  return resized.toString();
}

// Returns e.g. "…?w=320 320w, …?w=480 480w, …" or undefined for other hosts
export function imageSrcSet(url, widths = [320, 480, 720, 960]) {
  if (!url || !isResizable(url)) return undefined;
  return widths.map((width) => `${resizeImage(url, width)} ${width}w`).join(", ");
}

// How wide a product card is at each breakpoint (matches the grids)
export const PRODUCT_CARD_SIZES =
  "(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";
