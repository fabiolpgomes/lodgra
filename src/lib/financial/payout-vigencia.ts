/**
 * A base só aceita como início de vigência "hoje" no fuso da organização.
 * Se o dia mudou entre abrir o formulário e gravar (ex.: já passou da meia-noite em Lisboa),
 * a data enviada deixa de ser a de hoje: avisamos com clareza em vez de um "política inválida" genérico.
 */
export function staleVigenciaMessage(vigenciaInicio: string, today: string): string | null {
  if (vigenciaInicio === today) return null
  return `O dia mudou desde que abriu o formulário. Recarregue a página para usar a data de hoje (${today.split('-').reverse().join('/')}).`
}
