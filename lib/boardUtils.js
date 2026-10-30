export function getBoardCoordinates(square) {
  if (!Number.isInteger(square) || square < 1 || square > 100) return null;

  const rowFromBottom = Math.floor((square - 1) / 10);
  const indexInRow = (square - 1) % 10;

  return {
    col: rowFromBottom % 2 === 0 ? indexInRow : 9 - indexInRow,
    row: 9 - rowFromBottom,
  };
}

export function getSquareAtGridPosition(row, col) {
  const rowFromBottom = 9 - row;
  const indexInRow = rowFromBottom % 2 === 0 ? col : 9 - col;
  return rowFromBottom * 10 + indexInRow + 1;
}

export function getSquareCenter(square) {
  const position = getBoardCoordinates(square);
  if (!position) return null;
  return {
    x: position.col * 100 + 50,
    y: position.row * 100 + 50,
  };
}
