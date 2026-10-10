/** Remove tudo o que não é dígito. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function checkDigit(digits: number[], weights: number[]): number {
  const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0)
  const rest = sum % 11
  return rest < 2 ? 0 : 11 - rest
}

export function isValidCpf(value: string): boolean {
  const d = onlyDigits(value)
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false
  const n = d.split('').map(Number)
  const first = checkDigit(n.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = checkDigit(n.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  return first === n[9] && second === n[10]
}

export function isValidCnpj(value: string): boolean {
  const d = onlyDigits(value)
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false
  const n = d.split('').map(Number)
  const first = checkDigit(n.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = checkDigit(n.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return first === n[12] && second === n[13]
}

export function isValidCpfOrCnpj(value: string): boolean {
  return isValidCpf(value) || isValidCnpj(value)
}

/** Máscara progressiva: CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00). */
export function formatCpfCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14)
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2')
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

/** Máscara de telefone brasileiro: (00) 00000-0000 / (00) 0000-0000. */
export function formatBrPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
