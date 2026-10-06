/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * Dades fictícies del mode mock (`npm run dev:mock`). Només s'usa al
 * servidor de desenvolupament; mai entra al bundle de producció.
 *
 * - 12345678Z  → trobat directament
 * - 00000000T  → demana [day sn1]; amb day o sn1 informat, trobat
 * - X1234567L  → demana [colele] (no es pot resoldre en línia)
 * - qualsevol altre → no records found
 */
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

function normalizeDoc(raw: string): string {
  return raw.replace(/[\s-]+/g, '').toUpperCase()
}

function mockResponse(body: Record<string, unknown>): Record<string, unknown> {
  const doc = normalizeDoc(String(body.citizenId ?? ''))
  if (doc === '12345678Z') return MOCK_FOUND
  if (doc === '00000000T') {
    const hasDay = typeof body.day === 'string' && body.day.trim() !== ''
    const hasSn1 = typeof body.sn1 === 'string' && body.sn1.trim() !== ''
    if (hasDay || hasSn1) return { ...MOCK_FOUND, colele: 'ESCOLA DEL PARAL·LEL', dircol: 'AV. PARAL·LEL 1' }
    return { errorMessage: '[day sn1]' }
  }
  if (doc === 'X1234567L') return { errorMessage: '[colele]' }
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
