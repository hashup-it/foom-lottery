/**
 *
 * @param opacity [0-1]
 */
export const getColor = (color: string, opacity: number = 1) => {
  /* catch 'already parsed' case */
  if (color.startsWith('#') && color.length === 9) {
    return color
  }

  return `${color}${Math.floor(opacity * 255)
    .toString(16)
    .padStart(2, '0')}`
}
