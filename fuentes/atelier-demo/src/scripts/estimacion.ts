// Estimación ficticia del cotizador de la demo. Las cifras son ilustrativas: ATELIER no publica tarifas.

export const TAMANOS = { chica: { nombre: "Chica (hasta 6 cm)", base: 120, dias: 0 }, mediana: { nombre: "Mediana (hasta 12 cm)", base: 280, dias: 2 }, grande: { nombre: "Grande (hasta 25 cm)", base: 650, dias: 4 } } as const
export const MATERIALES = { "pla-mate": { nombre: "PLA mate", factor: 1 }, "pla-seda": { nombre: "PLA seda", factor: 1.15 }, petg: { nombre: "PETG resistente", factor: 1.25 } } as const
export const ARCHIVOS = { tengo: { nombre: "Sí, tengo el archivo 3D", extra: 0, dias: 0 }, diseno: { nombre: "No, necesito el diseño", extra: 350, dias: 3 }, nose: { nombre: "Aún no sé", extra: 175, dias: 2 } } as const

export type Pedido = { tamano: keyof typeof TAMANOS; material: keyof typeof MATERIALES; archivo: keyof typeof ARCHIVOS; cantidad: number }

/** Rango en pesos (múltiplos de 10) y días hábiles estimados. */
export function estimar({ tamano, material, archivo, cantidad }: Pedido) {
  const piezas = Math.max(1, Math.floor(cantidad))
  const descuento = piezas >= 10 ? 0.85 : piezas >= 5 ? 0.92 : 1
  const total = TAMANOS[tamano].base * MATERIALES[material].factor * piezas * descuento + ARCHIVOS[archivo].extra
  const redondear = (n: number) => Math.round(n / 10) * 10
  return {
    minimo: redondear(total * 0.85),
    maximo: redondear(total * 1.15),
    dias: 3 + TAMANOS[tamano].dias + ARCHIVOS[archivo].dias + Math.ceil(piezas / 10),
  }
}
