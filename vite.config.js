import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

function subtitleEditPlugin() {
  return {
    name: 'subtitle-edit-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // POST /api/subtitle/merge/{videoId}/{index} — 해당 자막을 이전 자막에 합침
        const mergeMatch = req.url?.match(/^\/api\/subtitle\/merge\/([^/]+)\/(\d+)$/)
        if (req.method === 'POST' && mergeMatch) {
          const videoId = mergeMatch[1]
          const subtitleIndex = parseInt(mergeMatch[2])
          const filePath = path.resolve('public/videos', `${videoId}.json`)

          try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
            const currIdx = data.findIndex(s => s.index === subtitleIndex)
            if (currIdx <= 0) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: '첫 번째 자막은 합칠 수 없습니다' }))
              return
            }
            const prev = data[currIdx - 1]
            const curr = data[currIdx]

            // 텍스트 합치기
            prev.text = prev.text.trimEnd() + ' ' + curr.text.trimStart()
            // 타임프레임 확장
            prev.end = curr.end
            // 발음/번역 합치기 (둘 다 있으면 이어붙임, 없으면 삭제)
            if (prev.pronunciation && curr.pronunciation) {
              prev.pronunciation = prev.pronunciation.trimEnd() + ' ' + curr.pronunciation.trimStart()
            } else {
              delete prev.pronunciation
            }
            if (prev.translation && curr.translation) {
              prev.translation = prev.translation.trimEnd() + ' ' + curr.translation.trimStart()
            } else {
              delete prev.translation
            }
            // 노트는 합침
            if (prev.notes && curr.notes) {
              prev.notes = [...prev.notes, ...curr.notes]
            } else if (curr.notes) {
              prev.notes = curr.notes
            }

            // 현재 자막 제거
            data.splice(currIdx, 1)
            // index 재부여
            data.forEach((s, i) => { s.index = i })

            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true, subtitles: data, mergedIndex: currIdx - 1 }))
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: err.message }))
          }
          return
        }

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
