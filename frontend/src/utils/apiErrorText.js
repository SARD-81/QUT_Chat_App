export const apiErrorText = (error, t) => {
  const code = error?.response?.data?.code;

  if (code) {
    const translated = t(`errors:${code}`);
    if (translated && translated !== `errors:${code}`) return translated;
  }

  return error?.response?.data?.message || t("errors:UNKNOWN");
};
