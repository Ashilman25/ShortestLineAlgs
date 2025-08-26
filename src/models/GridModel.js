// GridModel: grid state and wall management
export default class GridModel {
  constructor(rows = 20, cols = 20) {
    this.rows = rows
    this.cols = cols
    this.walls = new Set()
    this.start = null
    this.end   = null
  }
  setMarker(type, r, c) {
    if (type === 'start') this.start = { r, c }
    if (type === 'end')   this.end   = { r, c }
  }
  clearMarker(type) {
    if (type === 'start') this.start = null
    if (type === 'end')   this.end   = null
  }
  isWall(r, c) { return this.walls.has(`${r},${c}`) }
  addWall(r, c) { this.walls.add(`${r},${c}`) }
  removeWall(r, c) { this.walls.delete(`${r},${c}`) }
  clear() { this.walls.clear() }
  randomFill(prob = 0.3) {
    this.clear()
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (Math.random() < prob) this.walls.add(`${r},${c}`)
      }
    }
  }
}
