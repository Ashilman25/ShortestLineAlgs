// GridView: draws grid, walls, start/end on a canvas
export default class GridView {
  constructor(canvas, model, opt = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.model = model

    this.opt = {
      cellSize: 30,
      bgColor: null,
      gridColor: '#e5e7eb',
      wallColor: '#0f172a',
      renderScale: 1,              // ⬅️ NEW: multiply over devicePixelRatio
      ...opt
    }

    this._setupCanvas()
  }

  setRenderScale(scale = 1) {      // ⬅️ optional helper
    this.opt.renderScale = Math.max(1, Number(scale) || 1)
    this._setupCanvas()
    this.draw()
  }

  resize(cellSize) {
    this.opt.cellSize = cellSize
    this._setupCanvas()
    this.draw()
  }

  draw() {
    const { ctx, model: m, opt: o } = this

    const { width, height } = this.canvas
    ctx.clearRect(0, 0, width, height)
    ctx.strokeStyle = this.opt.gridColor || 'rgba(148,163,184,.28)';
    ctx.lineWidth = 1

    // grid lines
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

    // walls
    ctx.fillStyle = o.wallColor
    for (const id of m.walls) {
      const [r, c] = id.split(',').map(Number)
      ctx.fillRect(c * o.cellSize + 1, r * o.cellSize + 1, o.cellSize - 1, o.cellSize - 1)
    }

    // start / end
    if (m.start) {
      ctx.fillStyle = '#16a34a'
      ctx.fillRect(m.start.c * o.cellSize + 1, m.start.r * o.cellSize + 1, o.cellSize - 1, o.cellSize - 1)
      ctx.strokeStyle = 'rgba(22,163,74,.55)'
      ctx.lineWidth = 2
      ctx.strokeRect(m.start.c * o.cellSize + 1.5, m.start.r * o.cellSize + 1.5, o.cellSize - 3, o.cellSize - 3)
    }
    if (m.end) {
      ctx.fillStyle = '#ef4444'
      ctx.fillRect(m.end.c * o.cellSize + 1, m.end.r * o.cellSize + 1, o.cellSize - 1, o.cellSize - 1)
      ctx.strokeStyle = 'rgba(239,68,68,.55)'
      ctx.lineWidth = 2
      ctx.strokeRect(m.end.c * o.cellSize + 1.5, m.end.r * o.cellSize + 1.5, o.cellSize - 3, o.cellSize - 3)
    }
  }

  cssToCell(xCss, yCss) {
    const { cellSize } = this.opt
    return [Math.floor(yCss / cellSize), Math.floor(xCss / cellSize)]
  }

  _setupCanvas() {
    const dpr = (window.devicePixelRatio || 1) * (this.opt.renderScale || 1)  // ⬅️ multiply DPR
    const w = this.model.cols * this.opt.cellSize
    const h = this.model.rows * this.opt.cellSize
    this.canvas.width = Math.round(w * dpr)
    this.canvas.height = Math.round(h * dpr)
    this.canvas.style.width = w + 'px'
    this.canvas.style.height = h + 'px'

    // draw in CSS pixel space; browser maps to backing pixels
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
}
