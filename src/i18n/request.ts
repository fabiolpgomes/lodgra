import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale, type Locale } from '../../i18n.config';

export default getRequestConfig(async ({ requestLocale }) => {
  // Ensure requestLocale is a string (not a promise)
  let locale = await requestLocale;

  // Validate that the incoming locale is valid
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  const messages = (await import(`../locales/${locale}/common.json`)).default;
  const dashboardMessages = (await import(`../locales/${locale}/dashboard.json`)).default;
  const navigationMessages = (await import(`../locales/${locale}/navigation.json`)).default;
  const formsMessages = (await import(`../locales/${locale}/forms.json`)).default;
  const errorsMessages = (await import(`../locales/${locale}/errors.json`)).default;

  return {
    locale,
    messages: {
      common: messages,
      dashboard: dashboardMessages,
      navigation: navigationMessages,
      forms: formsMessages,
      errors: errorsMessages,
    },
  };
});
