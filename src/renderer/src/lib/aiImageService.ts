/**
 * AIImageService — encapsula toda la lógica de Pollinations.ai.
 *
 * El resto de la app NUNCA construye URLs de Pollinations manualmente:
 * todo pasa por aquí (construcción de prompts, URLs, seeds, catálogo de estilos).
 */

export interface AIStyle {
  id: string
  category: 'style' | 'color' | 'ambient' | 'lighting' | 'detail'
  name: string
  prompt: string
}

/** Catálogo de estilos. Agregar aquí nuevos estilos sin tocar la interfaz. */
export const AI_STYLES: AIStyle[] = [
  // Estilo artístico
  { id: 'manga', category: 'style', name: 'Manga', prompt: 'professional manga illustration, clean lineart, japanese manga' },
  { id: 'anime', category: 'style', name: 'Anime', prompt: 'masterpiece, anime illustration, vibrant colors, cinematic lighting' },
  { id: 'comic', category: 'style', name: 'Comic Americano', prompt: 'american comic book illustration, bold ink, dynamic composition' },
  { id: 'manhwa', category: 'style', name: 'Manhwa', prompt: 'korean webtoon style, clean digital illustration' },
  { id: 'realista', category: 'style', name: 'Realista', prompt: 'photorealistic, ultra detailed' },
  { id: 'boceto', category: 'style', name: 'Boceto', prompt: 'concept sketch, pencil drawing' },
  // Color
  { id: 'bn', category: 'color', name: 'Blanco y Negro', prompt: 'black and white, monochrome, screentones' },
  { id: 'fullcolor', category: 'color', name: 'Full Color', prompt: 'full color, vibrant colors' },
  { id: 'acuarela', category: 'color', name: 'Acuarela', prompt: 'watercolor painting' },
  { id: 'tinta', category: 'color', name: 'Tinta', prompt: 'ink illustration' },
  { id: 'lapiz', category: 'color', name: 'Lápiz', prompt: 'graphite sketch' },
  // Ambiente
  { id: 'soleado', category: 'ambient', name: 'Soleado', prompt: 'sunny, bright daylight' },
  { id: 'atardecer', category: 'ambient', name: 'Atardecer', prompt: 'sunset, golden hour' },
  { id: 'noche', category: 'ambient', name: 'Noche', prompt: 'night, dark, moonlight' },
  { id: 'lluvia', category: 'ambient', name: 'Lluvia', prompt: 'rain, wet, rainy day' },
  { id: 'primavera', category: 'ambient', name: 'Primavera', prompt: 'spring, cherry blossoms' },
  { id: 'otono', category: 'ambient', name: 'Otoño', prompt: 'autumn, fall, orange leaves' },
  { id: 'invierno', category: 'ambient', name: 'Invierno', prompt: 'winter, snow, cold' },
  { id: 'niebla', category: 'ambient', name: 'Niebla', prompt: 'foggy, misty atmosphere' },
  // Iluminación
  { id: 'cinematica', category: 'lighting', name: 'Cinemática', prompt: 'cinematic lighting' },
  { id: 'dramatica', category: 'lighting', name: 'Dramática', prompt: 'dramatic lighting, high contrast' },
  { id: 'suave', category: 'lighting', name: 'Suave', prompt: 'soft lighting, gentle illumination' },
  { id: 'calida', category: 'lighting', name: 'Luz cálida', prompt: 'warm lighting' },
  { id: 'fria', category: 'lighting', name: 'Luz fría', prompt: 'cold lighting, blue tones' },
  // Nivel de detalle
  { id: 'simple', category: 'detail', name: 'Simple', prompt: 'simple, minimal details' },
  { id: 'normal', category: 'detail', name: 'Normal', prompt: 'moderately detailed' },
  { id: 'detallado', category: 'detail', name: 'Muy detallado', prompt: 'highly detailed, intricate' },
]

/** Etiquetas de calidad SIempre al inicio del prompt (transparentes para el usuario) */
const QUALITY_PREFIX = 'masterpiece, best quality, professional illustration, highly detailed'

export interface AISelections {
  style?: string
  color?: string
  ambient?: string
  lighting?: string
  detail?: string
}

/** Construye el prompt final a partir del texto del usuario + selecciones de estilos */
export function buildPrompt(userPrompt: string, selections: AISelections): string {
  const parts: string[] = [QUALITY_PREFIX]

  for (const id of Object.values(selections)) {
    if (!id) continue
    const style = AI_STYLES.find((s) => s.id === id)
    if (style) parts.push(style.prompt)
  }

  const trimmed = userPrompt.trim()
  if (trimmed) parts.push(trimmed)

  return parts.join(', ')
}

/** Construye la URL de Pollinations para un prompt, dimensiones y seed dados.
 *  Si se pasa un token, se añade como parámetro `&token=` para autenticar la petición. */
export function buildUrl(prompt: string, width: number, height: number, seed: number, token?: string): string {
  const encoded = encodeURIComponent(prompt)
  let url = `https://image.pollinations.ai/prompt/${encoded}?width=${Math.round(width)}&height=${Math.round(height)}&seed=${seed}`
  if (token) url += `&token=${encodeURIComponent(token)}`
  return url
}

/** Genera N seeds únicos y aleatorios */
export function generateSeeds(count: number): number[] {
  const seeds: number[] = []
  while (seeds.length < count) {
    const s = Math.floor(Math.random() * 1000000)
    if (!seeds.includes(s)) seeds.push(s)
  }
  return seeds
}

/** Devuelve los estilos de una categoría concreta (para construir selects dinámicos) */
export function stylesByCategory(category: AIStyle['category']): AIStyle[] {
  return AI_STYLES.filter((s) => s.category === category)
}