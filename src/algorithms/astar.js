// A* on grid with Manhattan heuristic
export function aStarShortestPath(model) {
  const { rows, cols, start, end } = model
  if (!start || !end) return { path: [], branches: [] }

  const h = (r, c) => Math.abs(r - end.r) + Math.abs(c - end.c)
  const make2D = fill => Array.from({ length: rows }, () => Array(cols).fill(fill))

  const INF = 1e9
  const g = make2D(INF)
  const f = make2D(INF)
  const prev = make2D(null)
  const popped = []

  const pq = [{ r: start.r, c: start.c, f: h(start.r, start.c), g: 0 }]
  g[start.r][start.c] = 0
  f[start.r][start.c] = h(start.r, start.c)

  const DIRS = [[1,0],[-1,0],[0,1],[0,-1]]

  while (pq.length) {
    pq.sort((a,b) => (a.f === b.f ? a.g - b.g : a.f - b.f))
    const { r, c, g: gCur } = pq.shift()
    popped.push({ r, c })
    if (r === end.r && c === end.c) break

    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      if (model.isWall(nr, nc)) continue

      const tentativeG = gCur + 1
      if (tentativeG < g[nr][nc]) {
        g[nr][nc] = tentativeG
        f[nr][nc] = tentativeG + h(nr, nc)
        prev[nr][nc] = { r, c }
        pq.push({ r: nr, c: nc, f: f[nr][nc], g: tentativeG })
      }
    }
  }

  if (g[end.r][end.c] === INF) return { path: [], branches: [] }

  const path = []
  for (let cur = end; cur; cur = prev[cur.r][cur.c]) path.push({ r: cur.r, c: cur.c })
  const shortest = path.reverse()

  const onShortest = new Set(shortest.map(({ r, c }) => `${r},${c}`))
  const branches = []

  for (const node of popped) {
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
