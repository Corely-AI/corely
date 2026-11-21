// Undo the clockwise PDF display rotation before translating into PDF user space.
function toPdfRectangle(rect, crop, degrees) {
  const { x, y, width: w, height: h } = rect;
  const rotation = ((degrees % 360) + 360) % 360;
  let box;
  switch (rotation) {
    case 0:
      box = [x, 1 - y - h, w, h];
      break;
    case 90:
      box = [y, x, h, w];
      break;
    case 180:
      box = [1 - x - w, y, w, h];
      break;
    case 270:
      box = [1 - y - h, 1 - x - w, h, w];
      break;
    default:
      throw new Error("Unsupported page rotation");
  }
  return {
    x: crop.x + box[0] * crop.width,
    y: crop.y + box[1] * crop.height,
    width: box[2] * crop.width,
    height: box[3] * crop.height,
  };
}

module.exports = { toPdfRectangle };
