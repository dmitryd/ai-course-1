import type { SupabaseClient } from "@supabase/supabase-js"

import { AppError } from "@/lib/errors"
import type { Database } from "@/lib/supabase/database"

type AppSupabaseClient = SupabaseClient<Database>

const INITIAL_CREDITS = 5

function mapRpcError(message: string) {
  if (message.includes("AUTH_REQUIRED")) {
    return new AppError("AUTH_REQUIRED", 401, "Войдите в аккаунт, чтобы получать краткие содержания видео.")
  }

  if (message.includes("INSUFFICIENT_CREDITS")) {
    return new AppError(
      "INSUFFICIENT_CREDITS",
      402,
      "У вас закончились кредиты. Войдите снова, чтобы получить временное пополнение.",
    )
  }

  return new AppError("INTERNAL_ERROR", 500, "Не удалось обновить баланс кредитов.")
}

async function runCreditsRpc(
  supabase: AppSupabaseClient,
  fn: "ensure_user_credits" | "consume_credit" | "temporarily_refill_credits_on_login_if_empty",
) {
  const { data, error } = await supabase.rpc(fn)

  if (error) {
    throw mapRpcError(error.message)
  }

  if (typeof data !== "number") {
    throw new AppError("INTERNAL_ERROR", 500, "Баланс кредитов вернулся в неожиданном формате.")
  }

  return data
}

export async function requireAuthenticatedUser(supabase: AppSupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new AppError("AUTH_REQUIRED", 401, "Войдите в аккаунт, чтобы продолжить.")
  }

  return user
}

export async function getAvailableCredits(supabase: AppSupabaseClient) {
  return runCreditsRpc(supabase, "ensure_user_credits")
}

export async function consumeCredit(supabase: AppSupabaseClient) {
  return runCreditsRpc(supabase, "consume_credit")
}

export async function getInitialCreditsAmount() {
  return INITIAL_CREDITS
}

/**
 * TEMPORARY LOGIN REFILL START
 * Remove this helper and the `/api/auth/login-bootstrap` route call
 * once credits should stop refilling on re-login.
 */
export async function applyTemporaryLoginCreditRefill(supabase: AppSupabaseClient) {
  return runCreditsRpc(supabase, "temporarily_refill_credits_on_login_if_empty")
}
/** TEMPORARY LOGIN REFILL END */
