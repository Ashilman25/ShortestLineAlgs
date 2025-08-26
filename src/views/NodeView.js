// NodeView: interactive node/edge canvas, incl. animation
export default class NodeView {
  constructor(canvas, model, opt = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.model = model
    this.opt = { font: '16px system-ui', ...opt }

    this._dragging = null
    this._edgeMode = false
    this._edgeFrom = null
    this._delMode = false
    this._hoverEdge = null
    this._delNodeMode = false
    this._hoverNode = null
    this._cursor = null
    this._hover = null

    this.anim = { path: [], seg: 0, progress: 0, playing: false }

    this._setupCanvas()
    this._bindEvents()
    this.draw()
  }
  _setupCanvas() {
    const dpr = window.devicePixelRatio || 1
    const cssW = 22 * 30
    const cssH = 19 * 30
    this.canvas.style.width = cssW + 'px'
    this.canvas.style.height = cssH + 'px'
    this.canvas.width = cssW * dpr
    this.canvas.height = cssH * dpr
    this.ctx.setTransform(1,0,0,1,0,0)
    this.ctx.scale(dpr, dpr)
  }
  _bindEvents() {
    this._down = e => this._onDown(e)
    this._move = e => this._onMove(e)
    this._up   = e => this._onUp(e)
    this._dbl  = e => this._onDbl(e)
    this.canvas.addEventListener('mousedown', this._down)
    this.canvas.addEventListener('dblclick', this._dbl)
    window.addEventListener('mousemove', this._move)
    window.addEventListener('mouseup', this._up)
  }
  destroy() {
    this.canvas.removeEventListener('mousedown', this._down)
    this.canvas.removeEventListener('dblclick', this._dbl)
    window.removeEventListener('mousemove', this._move)
    window.removeEventListener('mouseup', this._up)
  }
  _eventPos(ev) {
    const rect = this.canvas.getBoundingClientRect()
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top }
  }
  _onDown(ev) {
    const { x, y } = this._eventPos(ev)
    const node = this.model.nodeAt(x, y)
    if (!this._edgeMode && !this._delMode) {
      if (node && (node.id === this.model.start || node.id === this.model.goal)) {
        if (node.id === this.model.start) this.model.clearMarker('start')
        if (node.id === this.model.goal)  this.model.clearMarker('end')
        this.draw(); return
      }
    }
    if (this._edgeMode) { this._edgeFrom = node; return }
    if (node) this._dragging = { node, dx: x - node.x, dy: y - node.y }
  }
  _onMove(ev) {
    const { x, y } = this._eventPos(ev)
    this._cursor = { x, y }
    this._hover  = this.model.nodeAt(x, y)
    if (this._delNodeMode) this._hoverNode = this.model.nodeAt(x, y)
    if (this._dragging) this.model.move(this._dragging.node, x - this._dragging.dx, y - this._dragging.dy)
    if (this._delMode) {
      this._hoverEdge = null
      const id2node = id => this.model.nodes.find(n => n.id === id)
      let best = { d: 8 }
      for (const e of this.model.edges) {
        const a = id2node(e.from), b = id2node(e.to)
        if (!a || !b) continue
        const d = this._distToSegment(x, y, a.x, a.y, b.x, b.y)
        if (d < best.d) best = { d, e }
      }
      this._hoverEdge = best.e || null
    }
    this.draw()
  }
  _onUp(ev) {
    if (this._delNodeMode && this._hoverNode) {
      this.model.remove(this._hoverNode); this._hoverNode = null; this.draw(); return
    }
    if (this._edgeMode && this._edgeFrom) {
      const { x, y } = this._eventPos(ev)
      const toNode = this.model.nodeAt(x, y)
      if (toNode) this.model.addEdge(this._edgeFrom, toNode)
      this._edgeFrom = null; this.draw(); return
    }
    if (this._delMode && this._hoverEdge) {
      this.model.removeEdge(this._hoverEdge.from, this._hoverEdge.to)
      this._hoverEdge = null; this.draw(); return
    }
    this._dragging = null; this.draw()
  }
  _onDbl(ev) {
    if (this._edgeMode || this._delMode || this._delNodeMode) return
    const { x, y } = this._eventPos(ev)
    const edge = this._edgeAt(x, y, 10)
    if (!edge) return
    const val = prompt('Edge weight:', edge.w)
    const w = Number(val)
    if (!isFinite(w) || w <= 0) return
    edge.w = w; this.draw()
  }
  setEdgeMode(on) {
    this._edgeMode = on; this._edgeFrom = null; this._cursor = null; this._hover = null
    this.canvas.style.cursor = on ? 'crosshair' : 'default'; this.draw()
  }
  setDeleteEdgeMode(on) {
    this._delMode = on
    if (on) { this._edgeMode = false; this._edgeFrom = null }
    this._hoverEdge = null; this.canvas.style.cursor = on ? 'crosshair' : 'default'; this.draw()
  }
  setDeleteNodeMode(on) {
    this._delNodeMode = on
    if (on) { this._edgeMode = false; this._delMode = false; this._edgeFrom = null }
    this._hoverNode = null; this.canvas.style.cursor = on ? 'crosshair' : 'default'; this.draw()
  }
  _edgeAt(x, y, tolerance = 8) {
    const id2node = id => this.model.nodes.find(n => n.id === id)
    for (const e of this.model.edges) {
      const a = id2node(e.from), b = id2node(e.to)
      if (!a || !b) continue
      if (this._distToSegment(x, y, a.x, a.y, b.x, b.y) <= tolerance) return e
    }
    return null
  }
  _distToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay
    const len2 = dx*dx + dy*dy || 1
    const t = Math.max(0, Math.min(1, ((px-ax)*dx + (py-ay)*dy) / len2))
    const ix = ax + t*dx, iy = ay + t*dy
    return Math.hypot(px - ix, py - iy)
  }
  draw() {
    const ctx = this.ctx
    const { width, height } = this.canvas
    ctx.clearRect(0, 0, width, height)
    ctx.lineWidth = 2
    const id2node = id => this.model.nodes.find(n => n.id === id)

    for (const e of this.model.edges) {
      const a = id2node(e.from), b = id2node(e.to)
      if (!a || !b) continue
      const isHover = this._delMode && this._hoverEdge &&
        e.from === this._hoverEdge.from && e.to === this._hoverEdge.to

      ctx.strokeStyle = ctx.fillStyle = isHover ? '#e33' : '#444'
      ctx.lineWidth = isHover ? 4 : 2

      const dx = b.x - a.x, dy = b.y - a.y
      const len = Math.hypot(dx, dy)
      const ux = dx / len, uy = dy / len
      const startX = a.x + ux * a.r, startY = a.y + uy * a.r
      const endX = b.x - ux * b.r,   endY   = b.y - uy * b.r

      ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke()

      const arrowLen = 10, arrowW = 6
      const hx = endX - ux * arrowLen, hy = endY - uy * arrowLen
      ctx.beginPath()
      ctx.moveTo(endX, endY)
      ctx.lineTo(hx + uy * arrowW, hy - ux * arrowW)
      ctx.lineTo(hx - uy * arrowW, hy + ux * arrowW)
      ctx.closePath(); ctx.fill()

      ctx.fillStyle = '#000'; ctx.font = '12px system-ui'
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
      const midX = (startX + endX) / 2, midY = (startY + endY) / 2
      ctx.fillText(String(e.w), midX, midY - 2)
    }

    if (this._edgeMode && this._edgeFrom && this._cursor) {
      const a = this._edgeFrom, b = this._cursor
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy)
      if (len > 5) {
        const ux = dx / len, uy = dy / len
        const startX = a.x + ux * a.r, startY = a.y + uy * a.r
        ctx.setLineDash([5,5]); ctx.strokeStyle='#888'; ctx.lineWidth=2
        ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(b.x, b.y); ctx.stroke()
        ctx.setLineDash([])
      }
    }

    ctx.font = this.opt.font; ctx.textAlign='center'; ctx.textBaseline='middle'
    for (const n of this.model.nodes) {
      const highlight = (this._edgeMode && (n === this._edgeFrom || n === this._hover)) ||
                        (this._delNodeMode && n === this._hoverNode)
      let fill = '#fff'
      if (n.id === this.model.start) fill = '#0a0'
      else if (n.id === this.model.goal) fill = '#a00'
      else if (highlight) fill = '#fffcce'

      if (highlight && this._delNodeMode) { ctx.strokeStyle = '#e33'; ctx.lineWidth = 4 }
      else { ctx.strokeStyle = '#000'; ctx.lineWidth = 2 }

      ctx.fillStyle = fill
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#000'; ctx.fillText(n.id, n.x, n.y)
    }

    if (this.anim.path.length) {
      const curNode = id2node(this.anim.path[this.anim.seg])
      ctx.strokeStyle = '#daa520'; ctx.lineWidth = 4
      ctx.beginPath(); ctx.arc(curNode.x, curNode.y, curNode.r + 3, 0, Math.PI * 2); ctx.stroke()
      if (this.anim.seg < this.anim.path.length - 1) {
        const nextNode = id2node(this.anim.path[this.anim.seg + 1])
        const t = this.anim.progress
        const x = curNode.x + (nextNode.x - curNode.x) * t
        const y = curNode.y + (nextNode.y - curNode.y) * t
        ctx.fillStyle = 'rgba(255,215,0,0.8)'; ctx.beginPath(); ctx.arc(x,y,8,0,Math.PI*2); ctx.fill()
      }
    }
  }
  addNode() {
    const rect = this.canvas.getBoundingClientRect()
    this.model.add(rect.width / 2, rect.height / 2); this.draw()
  }
  startAnim(path) { this.anim = { path, seg: 0, progress: 0, playing: true }; this._tick() }
  pause() { this.anim.playing = false }  // alias kept for React wiring
  pauseAnim() { this.anim.playing = false }
  stepAnim() {
    if (!this.anim.path.length) return
    if (this.anim.seg < this.anim.path.length - 1) this.anim.seg++
    this.anim.progress = 0; this.draw()
  }
  resetAnim() { this.anim = { path: [], seg: 0, progress: 0, playing: false }; this.draw() }
  _tick() {
    if (!this.anim.playing) return
    this.anim.progress += 0.02
    if (this.anim.progress >= 1) {
      this.anim.progress = 0; this.anim.seg++
      if (this.anim.seg >= this.anim.path.length - 1) {
        this.anim.seg = this.anim.path.length - 1; this.anim.playing = false
      }
    }
    this.draw()
    if (this.anim.playing) requestAnimationFrame(() => this._tick())
  }
}
