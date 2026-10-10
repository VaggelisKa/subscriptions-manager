/** Supabase Auth errors as the auth screens show them. */

type AuthErrorLike = { message: string; code?: string };

const messages: Record<string, string> = {
  otp_expired: "That code is wrong or has expired. Check the latest email or send a new code.",
  // signInWithOtp with shouldCreateUser: false, for an address without an account.
  otp_disabled: "There's no account for this email. Create one first.",
  user_not_found: "There's no account for this email. Create one first.",
  invalid_credentials: "Wrong email or password.",
  email_address_invalid: "Invalid email address",
  over_email_send_rate_limit: "Too many emails sent. Wait a minute and try again.",
  over_request_rate_limit: "Too many attempts. Wait a minute and try again.",
  weak_password: "Choose a stronger password.",
  same_password: "Choose a password that's different from your current one.",
  user_already_exists: "There's already an account for this email. Sign in instead.",
};

export function authErrorMessage(error: AuthErrorLike) {
  return (error.code && messages[error.code]) || error.message;
}
