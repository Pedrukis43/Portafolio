// node --experimental-strip-types fuentes/atelier-demo/pruebas/estimacion.test.mjs
import assert from "node:assert/strict"
import { estimar } from "../src/scripts/estimacion.ts"

// Una pieza chica en PLA mate con archivo propio: 120 ± 15 %, 4 días.
assert.deepEqual(estimar({ tamano: "chica", material: "pla-mate", archivo: "tengo", cantidad: 1 }), { minimo: 100, maximo: 140, dias: 4 })
// Diez piezas medianas en PETG con diseño: 280 × 1.25 × 10 × 0.85 + 350 = 3325.
assert.deepEqual(estimar({ tamano: "mediana", material: "petg", archivo: "diseno", cantidad: 10 }), { minimo: 2830, maximo: 3820, dias: 9 })
// Cantidades inválidas cuentan como una pieza.
assert.equal(estimar({ tamano: "chica", material: "pla-mate", archivo: "tengo", cantidad: 0 }).minimo, 100)
console.log("estimacion: 3 comprobaciones correctas")
