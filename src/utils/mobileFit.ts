/**
 * Viewport-fit scaling for the game canvas on touch devices (tanks-306).
 */

/**
 * Scale for the mobile "fill" layout: the game fills the available play area
 * (cover), so on narrow phones it stays large instead of shrinking to fit the
 * whole battlefield width (which wasted most of the screen). The overflowing
 * dimension is made pannable by the scroll container. Never scales up past 1.
 *
 * @param viewportWidth   Usable width in px.
 * @param availableHeight Height available above the fixed controls, in px.
 * @param containerWidth  Full game-container width (terrain + frame), in px.
 * @param containerHeight Full game-container height (terrain + frame), in px.
 * @returns A scale in (0, 1].
 */
export function computeMobileFillScale(
  viewportWidth: number,
  availableHeight: number,
  containerWidth: number,
  containerHeight: number
): number {
  if (containerWidth <= 0 || containerHeight <= 0) return 1;
  const widthRatio = viewportWidth / containerWidth;
  const heightRatio = availableHeight / containerHeight;
  // Cover: fill whichever dimension needs the larger scale; cap at 1.
  return Math.min(Math.max(widthRatio, heightRatio), 1);
}
