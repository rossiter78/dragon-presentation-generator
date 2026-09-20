/* The export button's other half.

   `export-pdf.mjs` drives a real Chromium through the deck, which a page in
   a browser cannot do to itself: it has no way to screenshot every section
   at a fixed viewport, and the client-side DOM-to-canvas libraries that claim
   to are exactly the fidelity gamble the raster export exists to avoid —
   they routinely mangle `clip-path`, `filter` and motion's transforms, which
   is most of what this deck is made of.

   So the button asks the server, and the server runs the same script you
   would have run by hand. Identical output, no second code path.

   This is an AUTHORING convenience and it is honest about that: the
   endpoint only exists while `npm run dev` or `npm run preview` is running
   on your machine. A built `dist/` served from anywhere else has no server
   to ask, the probe below fails, and the button never renders — rather than
   appearing and then failing under a click on stage.

   GET  /__export-pdf  runs the export and returns the file
   HEAD /__export-pdf  the probe the button uses to decide whether to exist
*/
import { spawn } from 'node:child_process'
import { readFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Connect, PluginOption, ViteDevServer, PreviewServer } from 'vite'
import { PDF_FILENAME, TALK } from './src/deck/talk.config.ts'

const ROUTE = '/__export-pdf'

/** One export at a time. The script drives a browser over the same server
 *  that is handling this request, and two of them racing would mostly
 *  produce two slow exports and a confusing log. */
let running: Promise<Buffer> | null = null

function runExport(base: string): Promise<Buffer> {
  if (running) return running

  const out = join(tmpdir(), `${TALK.slug}-export-${Date.now()}`)
  const pdf = join(out, 'deck.pdf')

  running = new Promise<Buffer>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['export-pdf.mjs'],
      {
        cwd: process.cwd(),
        env: { ...process.env, OUT: out, PDF: pdf, BASE: base },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )

    let log = ''
    child.stdout.on('data', (d) => {
      log += d
      process.stdout.write(d) // the run belongs in the terminal too
    })
    child.stderr.on('data', (d) => {
      log += d
      process.stderr.write(d)
    })

    child.on('error', reject)
    child.on('close', async (code) => {
      // A non-zero exit means the script's own checks failed — a section
      // that was short, an image that did not decode. The PDF still exists
      // and is still worth having, so hand it over and let the terminal
      // carry the warning rather than silently returning nothing.
      try {
        resolve(await readFile(pdf))
      } catch {
        reject(new Error(`export failed (exit ${code})\n${log}`))
      }
    })
  }).finally(() => {
    running = null
    void unlink(pdf).catch(() => {})
  })

  return running
}

function middleware(getBase: () => string): Connect.NextHandleFunction {
  return (req, res, next) => {
    if (!req.url?.startsWith(ROUTE)) return next()

    if (req.method === 'HEAD') {
      res.statusCode = 204
      return res.end()
    }

    console.log('\n[export-pdf] button pressed — walking the deck…')
    runExport(getBase()).then(
      (buf) => {
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Length', buf.length)
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${PDF_FILENAME}"`,
        )
        res.end(buf)
        console.log('[export-pdf] sent to the browser\n')
      },
      (err: Error) => {
        res.statusCode = 500
        res.setHeader('Content-Type', 'text/plain')
        res.end(String(err.message))
        console.error('[export-pdf] failed:', err.message)
      },
    )
  }
}

/** The address the exporter's browser should load. Taken from the server
 *  that is actually listening, so it follows a changed port. */
function addressOf(server: ViteDevServer | PreviewServer, fallbackPort: number) {
  const url = server.resolvedUrls?.local?.[0]
  if (url) return url.replace(/\/$/, '')
  const addr = server.httpServer?.address()
  const port = typeof addr === 'object' && addr ? addr.port : fallbackPort
  return `http://localhost:${port}`
}

export function exportPdf(): PluginOption {
  return {
    name: 'deck-export-pdf',
    // Authoring only — never bundled into dist/.
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(middleware(() => addressOf(server, 5173)))
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware(() => addressOf(server, 4173)))
    },
  }
}
