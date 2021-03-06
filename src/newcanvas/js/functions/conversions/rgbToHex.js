export function rgbToHex(rgb) {
  return (
    '#' +
    rgb
      .map((value, index) =>
        index < 3 ? ('0' + value.toString(16)).slice(-2) : ''
      )
      .join('')
  )
}
