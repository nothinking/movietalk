import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

function subtitleEditPlugin() {
  return {
    name: 'subtitle-edit-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // PUT /api/subtitle/{videoId}/{index}
        const match = req.url?.match(/^\/api\/subtitle\/([^/]+)\/(\d+)$/)
        if (req.method === 'PUT' && match) {
          const videoId = match[1]
          const subtitleIndex = parseInt(match[2])
          const filePath = path.resolve('public/videos', `${videoId}.json`)

          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            try {
              const updatedFields = JSON.parse(body)
              const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
              const idx = data.findIndex(s => s.index === subtitleIndex)
              if (idx === -1) {
                res.writeHead(404, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: 'Subtitle not found' }))
                return
              }
              // 수정 가능한 필드만 업데이트
              if (updatedFields.pronunciation !== undefined)
                data[idx].pronunciation = updatedFields.pronunciation
              if (updatedFields.translation !== undefined)
                data[idx].translation = updatedFields.translation
              if (updatedFields.notes !== undefined)
                data[idx].notes = updatedFields.notes

              fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: true, subtitle: data[idx] }))
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: err.message }))
            }
          })
          return
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), subtitleEditPlugin()],
  server: {
    port: 3000,
    open: true,
  },
})
