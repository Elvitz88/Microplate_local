export const resolveContinueUrl = (
  input: string | undefined,
  defaultUrl: string,
  allowedOrigins: string[]
): string => {
  if (!input) return defaultUrl;

  try {
    const target = new URL(input);
    if (allowedOrigins.length > 0 && !allowedOrigins.includes(target.origin)) {
      return defaultUrl;
    }
    return target.toString();
  } catch {
    return defaultUrl;
  }
};
