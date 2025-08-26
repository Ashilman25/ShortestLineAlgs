// GridView: draws grid, walls, start/end on a canvas
export default class GridView {
  constructor(canvas, model, opt = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.model = model
    this.opt = { cellSize: 30, bgColor: '#fff', gridColor: '#aaa', wallColor: '#444', ...opt }
    this._setupCanvas()
  }
  resize(cellSize) {
    this.opt.cellSize = cellSize
    this._setupCanvas(true)
    this.draw()
  }
  draw() {
    const { ctx, model: m, opt: o } = this
    ctx.fillStyle = o.bgColor
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    ctx.strokeStyle = o.gridColor
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let r = 0; r <= m.rows; r++) {
      const y = r * o.cellSize + .5
      ctx.moveTo(0, y); ctx.lineTo(m.cols * o.cellSize, y)
    }
    for (let c = 0; c <= m.cols; c++) {
      const x = c * o.cellSize + .5
      ctx.moveTo(x, 0); ctx.lineTo(x, m.rows * o.cellSize)
    }
    ctx.stroke()

    ctx.fillStyle = o.wallColor
    for (const id of m.walls) {
      const [r, c] = id.split(',').map(Number)
      ctx.fillRect(c * o.cellSize + 1, r * o.cellSize + 1, o.cellSize - 1, o.cellSize - 1)
    }

    if (m.start) {
      ctx.fillStyle = '#0a0'
      ctx.fillRect(m.start.c * o.cellSize + 1, m.start.r * o.cellSize + 1, o.cellSize - 1, o.cellSize - 1)
    }
    if (m.end) {
      ctx.fillStyle = '#a00'
      ctx.fillRect(m.end.c * o.cellSize + 1, m.end.r * o.cellSize + 1, o.cellSize - 1, o.cellSize - 1)
    }
  }
  cssToCell(xCss, yCss) {
    const { cellSize } = this.opt
    return [Math.floor(yCss / cellSize), Math.floor(xCss / cellSize)]
  }
  _setupCanvas() {
    const dpr = window.devicePixelRatio || 1
    const w = this.model.cols * this.opt.cellSize
    const h = this.model.rows * this.opt.cellSize
    this.canvas.width = w * dpr
    this.canvas.height = h * dpr
    this.canvas.style.width = w + 'px'
    this.canvas.style.height = h + 'px'
    this.ctx.setTransform(1,0,0,1,0,0)
    this.ctx.scale(dpr, dpr)
  }
}
