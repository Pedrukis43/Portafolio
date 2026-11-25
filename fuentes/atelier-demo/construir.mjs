// Compila la demo de ATELIER en dist/demos/atelier sin tocar el proyecto original.
// Copia el proyecto Astro a una carpeta temporal, sustituye la página por la de la demo y reutiliza
// sus node_modules con un enlace. Uso: node fuentes/atelier-demo/construir.mjs
// Origen por omisión: ../Atelier3D/page junto a la carpeta GITHUB; se cambia con ATELIER_ORIGEN.
import { cpSync, existsSync, mkdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const aqui = dirname(fileURLToPath(import.meta.url))
const repo = resolve(aqui, "../..")
const origen = resolve(process.env.ATELIER_ORIGEN ?? join(repo, "../../Atelier3D/page"))
const destino = join(repo, "dist/demos/atelier")
const obra = join(tmpdir(), "atelier-demo-portafolio")

if (!existsSync(join(origen, "node_modules/astro"))) throw new Error(`No encuentro el proyecto con dependencias en ${origen}`)

// Primero se suelta el enlace a node_modules: un borrado recursivo no debe alcanzar los del original.
const limpiar = () => {
  try { unlinkSync(join(obra, "node_modules")) } catch {}
  rmSync(obra, { recursive: true, force: true })
}
limpiar()
mkdirSync(obra, { recursive: true })
for (const archivo of ["package.json", "tsconfig.json", "src"]) cpSync(join(origen, archivo), join(obra, archivo), { recursive: true })
// Solo lo que usa la demo: impresora, entorno, pósteres, símbolo y favicon.
const sobran = ["og-atelier.jpg", "media/ejemplos", "models/llavero-am.glb"].map((ruta) => join(origen, "public", ruta))
cpSync(join(origen, "public"), join(obra, "public"), { recursive: true, filter: (ruta) => !sobran.includes(ruta) })
rmSync(join(obra, "src/pages"), { recursive: true })
cpSync(join(aqui, "src"), join(obra, "src"), { recursive: true })
// cacheDir propio: la caché de Vite no debe escribirse en los node_modules del original.
writeFileSync(
  join(obra, "astro.config.mjs"),
  'import { defineConfig } from "astro/config"\nexport default defineConfig({ base: "/Portafolio/demos/atelier/", vite: { cacheDir: "./.vite" } })\n',
)
symlinkSync(join(origen, "node_modules"), join(obra, "node_modules"), "junction")

const compilacion = spawnSync(process.execPath, ["node_modules/astro/bin/astro.mjs", "build"], { cwd: obra, stdio: "inherit" })
if (compilacion.status !== 0) process.exit(compilacion.status ?? 1)

rmSync(destino, { recursive: true, force: true })
cpSync(join(obra, "dist"), destino, { recursive: true })
limpiar()
console.log(`Demo de ATELIER copiada en ${destino}`)
