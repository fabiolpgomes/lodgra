import { redirect } from 'next/navigation'

export default async function EditReservationRedirect(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  redirect(`/pt-BR/reservations/${id}/edit`)
}
