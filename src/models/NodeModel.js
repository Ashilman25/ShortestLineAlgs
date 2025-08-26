// NodeModel: nodes + directed weighted edges
export default class NodeModel {
  constructor() {
    this.nodes = []
    this._counter = 0
    this.edges = []
    this.start = null
    this.goal  = null
  }
  _nextID() {
    let n = this._counter++
    let id = ''
    do {
      id = String.fromCharCode(65 + (n % 26)) + id
      n = Math.floor(n / 26) - 1
    } while (n >= 0)
    return id
  }
  add(x, y, r = 22) {
    const node = { id: this._nextID(), x, y, r }
    this.nodes.push(node); return node
  }
  nodeAt(x, y) {
    return this.nodes.find(n => (x - n.x) ** 2 + (y - n.y) ** 2 <= n.r ** 2)
  }
  move(node, x, y) { node.x = x; node.y = y }
  remove(node) {
    const i = this.nodes.indexOf(node)
    if (i !== -1) {
      this.nodes.splice(i, 1)
      this.edges = this.edges.filter(e => e.from !== node.id && e.to !== node.id)
    }
  }
  addEdge(fromNode, toNode) {
    if (!fromNode || !toNode || fromNode === toNode) return
    if (!this.edges.some(e => e.from === fromNode.id && e.to === toNode.id)) {
      this.edges.push({ from: fromNode.id, to: toNode.id, w: 1 })
    }
  }
  removeEdge(fromId, toId) {
    const i = this.edges.findIndex(e => e.from === fromId && e.to === toId)
    if (i !== -1) this.edges.splice(i, 1)
  }
  neighbours(node) {
    return this.edges
      .filter(e => e.from === node.id)
      .map(e => ({ node: this.nodes.find(n => n.id === e.to), edge: e }))
  }
  setMarker(kind, node) {
    if (kind === 'start') this.start = node.id
    if (kind === 'end')   this.goal  = node.id
  }
  clearMarker(kind) {
    if (kind === 'start') this.start = null
    if (kind === 'end')   this.goal  = null
  }
}
