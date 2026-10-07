/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { reduceDocument, validateFormato, type DocumentFormat } from './src/formato'

/**
 * Dades fictícies del mode mock (`npm run dev:mock`). Només s'usa al
 * servidor de desenvolupament; mai entra al bundle de producció.
 *
 * Els documents es poden escriure sencers o ja retallats: el mock els redueix
 * amb el mateix format que serveix a /api/formato. Amb el format per defecte
 * (últims 5 caràcters):
 *
 * - 12345678Z / 5678Z  → trobat directament
 * - 00000000T / 0000T  → demana [day sn1]; amb day o sn1 informat, trobat
 * - X1234567L / 4567L  → demana [colele] (no es pot resoldre en línia)
 * - qualsevol altre    → no records found
 *
 * El format es pot canviar per provar els altres modes:
 *   VITE_MOCK_FORMAT='{"documentChars":5,"firstChars":true,"addLetter":true}' npm run dev:mock
 */
const MOCK_FORMAT: DocumentFormat = (() => {
  const fallback: DocumentFormat = { documentChars: 5, firstChars: false, addLetter: false }
  const raw = process.env.VITE_MOCK_FORMAT
  if (!raw) return fallback
  try {
    const parsed = validateFormato(JSON.parse(raw))
    if (parsed) return parsed
  } catch {
    // continua amb el fallback
  }
  console.warn('VITE_MOCK_FORMAT no és un format vàlid; s’usa el per defecte.')
  return fallback
})()

const MOCK_FOUND = {
  poblacion: "RUBÍ",
  distrito: '02',
  seccion: '036',
  mesa: 'A',
  colele: 'ESCOLA NÚM. 36',
  dircol: 'C. MAJOR 36',
  postCode: '08191',
  errorMessage: '',
}

// Claus indexades dels documents ficticis, derivades del format actiu.
const MOCK_DOC_FOUND = reduceDocument('12345678Z', MOCK_FORMAT)
const MOCK_DOC_DISAMBIG = reduceDocument('00000000T', MOCK_FORMAT)
const MOCK_DOC_COLELE = reduceDocument('X1234567L', MOCK_FORMAT)

function mockResponse(body: Record<string, unknown>): Record<string, unknown> {
  const doc = reduceDocument(String(body.citizenId ?? ''), MOCK_FORMAT)
  if (doc === MOCK_DOC_FOUND) return MOCK_FOUND
  if (doc === MOCK_DOC_DISAMBIG) {
    const hasDay = typeof body.day === 'string' && body.day.trim() !== ''
    const hasSn1 = typeof body.sn1 === 'string' && body.sn1.trim() !== ''
    if (hasDay || hasSn1) return { ...MOCK_FOUND, colele: 'ESCOLA DEL PARAL·LEL', dircol: 'AV. PARAL·LEL 1' }
    return { errorMessage: '[day sn1]' }
  }
  if (doc === MOCK_DOC_COLELE) return { errorMessage: '[colele]' }
  return { errorMessage: 'no records found' }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString('utf8')
      if (data.length > 8192) req.destroy()
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function mockApiPlugin(): Plugin {
  return {
    name: 'censo-mock-api',
    configureServer(server) {
      server.middlewares.use('/api/formato', (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.end()
          return
        }
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(MOCK_FORMAT))
      })
      server.middlewares.use('/api/consulta', (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        void readBody(req).then((raw) => {
          let body: Record<string, unknown>
          try {
            body = JSON.parse(raw || '{}') as Record<string, unknown>
          } catch {
            body = {}
          }
          const payload = mockResponse(body)
          setTimeout(() => {
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(payload))
          }, 300)
        })
      })
    },
  }
}

const useMock = process.env.VITE_MOCK === '1'

export default defineConfig({
  base: './',
  plugins: [react(), ...(useMock ? [mockApiPlugin()] : [])],
  server: useMock
    ? {}
    : {
        proxy: {
          '/api': {
            target: process.env.BACKEND_URL ?? 'http://localhost:8080',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                // Només en desenvolupament: el token mai entra al bundle.
                if (process.env.BACKEND_TOKEN) {
                  proxyReq.setHeader('Authorization', process.env.BACKEND_TOKEN)
                }
              })
            },
          },
        },
      },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
})
