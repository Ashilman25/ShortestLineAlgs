// Dijkstra on unit-weight grid + node-graph variant
export function dijShortestPath(model) {
  const { rows, cols, start, end } = model
  if (!start || !end) return { path: [], branches: [] }

  const INF = 1e9
  const dist = Array.from({ length: rows }, () => Array(cols).fill(INF))
  const prev = Array.from({ length: rows }, () => Array(cols).fill(null))
  const popped = []

  const pq = [{ r: start.r, c: start.c, d: 0 }]
  dist[start.r][start.c] = 0
  const DIRS = [[1,0],[-1,0],[0,1],[0,-1]]

  while (pq.length) {
    pq.sort((a,b) => a.d - b.d)
    const { r, c, d } = pq.shift()
    popped.push({ r, c })
    if (r === end.r && c === end.c) break

    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      if (model.isWall(nr, nc)) continue
      const nd = d + 1
      if (nd < dist[nr][nc]) {
        dist[nr][nc] = nd
        prev[nr][nc] = { r, c }
        pq.push({ r: nr, c: nc, d: nd })
      }
    }
  }

  if (dist[end.r][end.c] === INF) return { path: [], branches: [] }

  const path = []
  for (let cur = end; cur; cur = prev[cur.r][cur.c]) path.push({ r: cur.r, c: cur.c })
  const shortest = path.reverse()

  const isOnShortest = new Set(shortest.map(({ r, c }) => `${r},${c}`))
  const branches = []
  for (const node of popped) {
    if (isOnShortest.has(`${node.r},${node.c}`)) continue
    const branch = []
    for (let cur = node; cur; cur = prev[cur.r][cur.c]) {
      branch.push({ r: cur.r, c: cur.c })
      if (cur.r === start.r && cur.c === start.c) break
    }
    branches.push(branch.reverse())
  }
  return { path: shortest, branches }
}

export function dijkstraNodePath(model) {
  if (!model.start || !model.goal) return []
  const dist = new Map()
  const prev = new Map()
  const pq = [{ id: model.start, d: 0 }]
  dist.set(model.start, 0)

  while (pq.length) {
    pq.sort((a,b) => a.d - b.d)
    const { id, d } = pq.shift()
    if (id === model.goal) break
    const node = model.nodes.find(n => n.id === id)
    for (const { node: nb, edge } of model.neighbours(node)) {
      if (!nb) continue
      const alt = d + edge.w
      if (!dist.has(nb.id) || alt < dist.get(nb.id)) {
        dist.set(nb.id, alt)
        prev.set(nb.id, id)
        pq.push({ id: nb.id, d: alt })
      }
    }
  }

  if (!dist.has(model.goal)) return []
  const path = []
  for (let cur = model.goal; cur; cur = prev.get(cur)) path.push(cur)
  return path.reverse()
}
