// Gradasi sampul per kategori event (tanpa gambar: EveTick memakai sampul
// besar di kartu, di sini diwakili gradasi hangat + ikon tiket watermark).
const CATEGORY_GRADIENTS: Record<string, string> = {
  Music: 'from-orange-500 via-rose-500 to-amber-500',
  Konser: 'from-orange-500 via-rose-500 to-amber-500',
  Concert: 'from-orange-500 via-rose-500 to-amber-500',
  Sports: 'from-emerald-500 via-teal-500 to-lime-500',
  Olahraga: 'from-emerald-500 via-teal-500 to-lime-500',
  Tech: 'from-sky-500 via-indigo-500 to-violet-500',
  Teknologi: 'from-sky-500 via-indigo-500 to-violet-500',
  Arts: 'from-fuchsia-500 via-purple-500 to-pink-500',
  Seni: 'from-fuchsia-500 via-purple-500 to-pink-500',
  Food: 'from-amber-500 via-yellow-500 to-orange-500',
  Kuliner: 'from-amber-500 via-yellow-500 to-orange-500',
}

const DEFAULT_GRADIENT = 'from-orange-500 via-rose-500 to-amber-500'

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

const FALLBACK_GRADIENTS = [
  'from-orange-500 via-rose-500 to-amber-500',
  'from-sky-500 via-indigo-500 to-violet-500',
  'from-emerald-500 via-teal-500 to-lime-500',
  'from-fuchsia-500 via-purple-500 to-pink-500',
]

export function categoryGradient(category: string | null | undefined): string {
  if (!category) return DEFAULT_GRADIENT
  const direct = CATEGORY_GRADIENTS[category]
  if (direct) return direct
  return FALLBACK_GRADIENTS[hashString(category) % FALLBACK_GRADIENTS.length]
}
