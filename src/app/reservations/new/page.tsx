import { redirect } from 'next/navigation'

function withSearch(pathname: string, searchParams?: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (Array.isArray(value)) {
      value.forEach(item => params.append(key, item))
    } else if (value) {
      params.set(key, value)
    }
  }
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

export default async function NewReservationRedirect(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  redirect(withSearch('/pt-BR/reservations/new', await props.searchParams))
}
