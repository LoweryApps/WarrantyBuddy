import type { AuthError } from "@supabase/supabase-js";

// Supabase's client-side error message isn't always a clean, displayable
// string — some server-side failure modes (e.g. the auth server's own email
// delivery erroring out) surface as an empty or malformed message. Fall back
// to a generic message rather than rendering whatever garbage came back.
export function authErrorMessage(error: AuthError): string {
  const message = error.message?.trim();
  if (!message || message === "{}" || message.startsWith("{")) {
    return "Something went wrong — please try again in a moment.";
  }
  return message;
}
