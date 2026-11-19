export const money = (minor: number, currency = "EGP") =>
  `${(minor / 100).toLocaleString("en-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;

export const eventDate = (value: string | null, options?: Intl.DateTimeFormatOptions) =>
  value
    ? new Intl.DateTimeFormat("en-EG", {
        timeZone: "Africa/Cairo",
        dateStyle: "medium",
        ...options,
      }).format(new Date(value))
    : "To be announced";

export const eventTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-EG", {
        timeZone: "Africa/Cairo",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(value))
    : "TBA";

export const errorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/^FirebaseError:\s*/i, "").replace(/^functions\/\w+\s*/i, "");
};
