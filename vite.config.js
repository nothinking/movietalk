import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

function subtitleEditPlugin() {
  return {
    name: 'subtitle-edit-api',
    configureServer(server) {
      // 자막 편집 API 미들웨어
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

        // POST /api/subtitle/split/{videoId}/{index} — 자막을 두 개로 분리
        const splitMatch = req.url?.match(/^\/api\/subtitle\/split\/([^/]+)\/(\d+)$/)
        if (req.method === 'POST' && splitMatch) {
          const videoId = splitMatch[1]
          const subtitleIndex = parseInt(splitMatch[2])
          const filePath = path.resolve('public/videos', `${videoId}.json`)

          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            try {
              const { splitAfterWord } = JSON.parse(body)
              const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
              const idx = data.findIndex(s => s.index === subtitleIndex)
              if (idx === -1) {
                res.writeHead(404, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: 'Subtitle not found' }))
                return
              }
              const sub = data[idx]
              const words = sub.text.split(/\s+/)
              if (splitAfterWord < 1 || splitAfterWord >= words.length) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: '잘못된 분리 위치' }))
                return
              }

              const textA = words.slice(0, splitAfterWord).join(' ')
              const textB = words.slice(splitAfterWord).join(' ')

              // 타임프레임을 글자 수 비율로 분배
              const ratio = textA.length / (textA.length + textB.length)
              const duration = sub.end - sub.start
              const midTime = Math.round((sub.start + duration * ratio) * 100) / 100

              // 발음/번역도 단어 수 비율로 분리 시도
              const splitField = (text, fieldWords) => {
                if (!text) return [undefined, undefined]
                const fw = text.split(/\s+/)
                const fieldRatio = Math.round(fw.length * ratio)
                const r = Math.max(1, Math.min(fw.length - 1, fieldRatio))
                return [fw.slice(0, r).join(' '), fw.slice(r).join(' ')]
              }

              const [pronA, pronB] = splitField(sub.pronunciation)
              const [transA, transB] = splitField(sub.translation)

              const subA = { ...sub, text: textA, end: midTime }
              const subB = { text: textB, start: midTime, end: sub.end }

              if (pronA) subA.pronunciation = pronA; else delete subA.pronunciation
              if (pronB) subB.pronunciation = pronB
              if (transA) subA.translation = transA; else delete subA.translation
              if (transB) subB.translation = transB

              // 노트는 A에 유지, B는 빈 배열
              delete subB.notes
              if (!sub.notes || sub.notes.length === 0) delete subA.notes

              // 삽입
              data.splice(idx, 1, subA, subB)
              // index 재부여
              data.forEach((s, i) => { s.index = i })

              fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: true, subtitles: data, splitIndex: idx }))
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: err.message }))
            }
          })
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

              // start/end 수정 시 인접 자막 시간 연동
              const affected = []
              const link = updatedFields.linkAdjacent !== false
              if (updatedFields.start !== undefined) {
                const newStart = parseFloat(updatedFields.start)
                data[idx].start = newStart
                if (link && idx > 0) {
                  data[idx - 1].end = newStart
                  affected.push(data[idx - 1])
                }
              }
              if (updatedFields.end !== undefined) {
                const newEnd = parseFloat(updatedFields.end)
                data[idx].end = newEnd
                if (link && idx < data.length - 1) {
                  data[idx + 1].start = newEnd
                  affected.push(data[idx + 1])
                }
              }

              fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: true, subtitle: data[idx], affected }))
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
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), subtitleEditPlugin()],
  server: {
    host: true,
    port: 3000,
    open: false,
  },
})
