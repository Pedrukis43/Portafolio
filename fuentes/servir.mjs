// Sirve dist/ bajo /Portafolio/, la misma ruta que usa GitHub Pages. Uso: node fuentes/servir.mjs [puerto]
import { createReadStream, statSync } from "node:fs"
import { createServer } from "node:http"
import { extname, join, normalize, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const raiz = resolve(fileURLToPath(new URL("../dist", import.meta.url)))
const puerto = Number(process.argv[2] ?? 4173)
const tipos = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".woff2": "font/woff2", ".woff": "font/woff", ".glb": "model/gltf-binary", ".exr": "image/x-exr" }

createServer((peticion, respuesta) => {
  const ruta = decodeURIComponent(new URL(peticion.url, "http://x").pathname)
  if (ruta === "/" ) return respuesta.writeHead(302, { location: "/Portafolio/" }).end()
  if (!ruta.startsWith("/Portafolio/")) return respuesta.writeHead(404).end("Fuera de /Portafolio/")
  let archivo = join(raiz, normalize(ruta.slice("/Portafolio".length)))
  if (!archivo.startsWith(raiz)) return respuesta.writeHead(403).end()
  try {
    if (statSync(archivo).isDirectory()) {
      // Como GitHub Pages: una carpeta sin barra final redirige a la ruta con barra.
      if (!ruta.endsWith("/")) return respuesta.writeHead(301, { location: `${ruta}/` }).end()
      archivo = join(archivo, "index.html")
    }
    statSync(archivo)
  } catch {
    return respuesta.writeHead(404).end("No encontrado")
  }
  respuesta.writeHead(200, { "content-type": tipos[extname(archivo)] ?? "application/octet-stream" })
  createReadStream(archivo).pipe(respuesta)
}).listen(puerto, "127.0.0.1", () => console.log(`Portafolio en http://127.0.0.1:${puerto}/Portafolio/`))
