// Floyd-Warshall all-pairs on grid (teaching/demo)
export function floydWarsShortestPath(model) {
  const { rows, cols, start, end } = model
  if (!start || !end) return { path: [], branches: [] }

  const V = rows * cols
  const idx = (r, c) => r * cols + c
  const rc  = v => ({ r: Math.floor(v / cols), c: v % cols })

  const INF = 1e9
  const dist = Array.from({ length: V }, () => Array(V).fill(INF))
  const next = Array.from({ length: V }, () => Array(V).fill(null))

  const DIRS = [[1,0],[-1,0],[0,1],[0,-1]]
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = idx(r, c)
      dist[v][v] = 0
      next[v][v] = v
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
        if (model.isWall(nr, nc)) continue
        const u = idx(nr, nc)
        dist[v][u] = 1
        next[v][u] = u
      }
    }
  }

  const startV = idx(start.r, start.c)
  const endV = idx(end.r, end.c)
  const improved = []

  for (let k = 0; k < V; k++) {
    for (let i = 0; i < V; i++) {
      const dik = dist[i][k]
      if (dik === INF) continue
      for (let j = 0; j < V; j++) {
        const alt = dik + dist[k][j]
        if (alt < dist[i][j]) {
          dist[i][j] = alt
          next[i][j] = next[i][k]
          if (i === startV) improved.push(j)
        }
      }
    }
  }

  if (dist[startV][endV] === INF) return { path: [], branches: [] }

  const path = []
  let v = startV
  while (v !== null && v !== endV) {
    path.push(rc(v))
    v = next[v][endV]
  }
  path.push(rc(endV))

  const onShortest = new Set(path.map(({ r, c }) => `${r},${c}`))
  const branches = []
  for (const j of improved) {
    const cell = rc(j)
    if (onShortest.has(`${cell.r},${cell.c}`)) continue
    const branch = []
    let u = startV
    while (u !== null && u !== j) {
      branch.push(rc(u))
      u = next[u][j]
      if (!u) break
    }
    branch.push(rc(j))
    branches.push(branch)
  }
  return { path, branches }
}
