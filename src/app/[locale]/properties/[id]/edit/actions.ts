'use server'

import { revalidatePath } from 'next/cache'

export async function revalidatePropertyPage(slug: string) {
  revalidatePath(`/p/${slug}`)
}
