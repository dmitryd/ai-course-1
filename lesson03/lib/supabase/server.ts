import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import { getServerEnv } from "@/lib/env"
import type { Database } from "@/lib/supabase/database"

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  const { supabaseUrl, supabaseAnonKey } = getServerEnv()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Cookie writes can be ignored when the client refreshes the session in middleware.
        }
      },
    },
  })
}
