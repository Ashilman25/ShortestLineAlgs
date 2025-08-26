// Bellman-Ford on unit-weight grid (teaching/demo)
export function bellmanFordShortestPath(model) {
  const { rows, cols, start, end } = model
  if (!start || !end) return { path: [], branches: [] }

  const INF = 1e9
  const make2D = fill => Array.from({ length: rows }, () => Array(cols).fill(fill))

  const dist = make2D(INF)
  const prev = make2D(null)
  const visitedOrder = []
  const seen = make2D(false)

  dist[start.r][start.c] = 0
  seen[start.r][start.c] = true

  const DIRS = [[1,0],[-1,0],[0,1],[0,-1]]
  const V = rows * cols

  for (let iter = 0; iter < V - 1; iter++) {
    let anyChange = false
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dHere = dist[r][c]
        if (dHere === INF) continue

        for (const [dr, dc] of DIRS) {
          const nr = r + dr, nc = c + dc
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
          if (model.isWall(nr, nc)) continue

          const nd = dHere + 1
          if (nd < dist[nr][nc]) {
            if (!seen[nr][nc]) {
              visitedOrder.push({ r: nr, c: nc })
              seen[nr][nc] = true
            }
            dist[nr][nc] = nd
            prev[nr][nc] = { r, c }
            anyChange = true
          }
        }
      }
    }
    if (!anyChange) break
  }

  if (dist[end.r][end.c] === INF) return { path: [], branches: [] }

  const path = []
  for (let cur = end; cur; cur = prev[cur.r][cur.c]) path.push({ r: cur.r, c: cur.c })
  const shortest = path.reverse()

  const onShortest = new Set(shortest.map(({ r, c }) => `${r},${c}`))
  const branches = []
  for (const node of visitedOrder) {
    if (onShortest.has(`${node.r},${node.c}`)) continue
    const branch = []
    for (let cur = node; cur; cur = prev[cur.r][cur.c]) {
      branch.push({ r: cur.r, c: cur.c })
      if (cur.r === start.r && cur.c === start.c) break
    }
    branches.push(branch.reverse())
  }
  return { path: shortest, branches }
}
