export const normalisePhone = (p: string) => p.replace(/[\s().-]/g, '')

// Accepts local (0821234567) or international (+27 82 123 4567) numbers: 7 to 15 digits
export const isValidPhone = (p?: string | null) => !!p && /^\+?[0-9]{7,15}$/.test(normalisePhone(p))
