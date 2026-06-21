import { redirect } from 'next/navigation';

export default async function NewCleaningTaskPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Redirect to main cleaning page
  // TODO: In future, can add ?modal=create to open modal automatically
  redirect(`/${locale}/cleaning`);
}
