// src/lib/slug.ts

export function slugify(text: string): string {
  if (!text) return ''

  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // прибрати діакритичні символи
    .replace(/[ъь]+/g, '')
    .replace(/[^a-zA-Z0-9а-яА-ЯіїєґІЇЄҐ\s-]/g, '') // залишити лише букви/цифри/пробіли/тире
    .replace(/\s+/g, '-') // пробіли → тире
    .replace(/-+/g, '-') // кілька тире → одне
    .replace(/^-|-$/g, '') // прибрати тире на початку/кінці
    .toLowerCase()
    // 🔹 транслітерація українських літер
    .replace(/а/g, 'a')
    .replace(/б/g, 'b')
    .replace(/в/g, 'v')
    .replace(/г/g, 'h')
    .replace(/ґ/g, 'g')
    .replace(/д/g, 'd')
    .replace(/е/g, 'e')
    .replace(/є/g, 'ie')
    .replace(/ж/g, 'zh')
    .replace(/з/g, 'z')
    .replace(/и/g, 'y')
    .replace(/і/g, 'i')
    .replace(/ї/g, 'i')
    .replace(/й/g, 'j')
    .replace(/к/g, 'k')
    .replace(/л/g, 'l')
    .replace(/м/g, 'm')
    .replace(/н/g, 'n')
    .replace(/о/g, 'o')
    .replace(/п/g, 'p')
    .replace(/р/g, 'r')
    .replace(/с/g, 's')
    .replace(/т/g, 't')
    .replace(/у/g, 'u')
    .replace(/ф/g, 'f')
    .replace(/х/g, 'kh')
    .replace(/ц/g, 'ts')
    .replace(/ч/g, 'ch')
    .replace(/ш/g, 'sh')
    .replace(/щ/g, 'shch')
    .replace(/ю/g, 'yu')
    .replace(/я/g, 'ya')
}
