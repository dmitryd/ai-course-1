import { z } from "zod"

export const authCredentialsSchema = z.object({
  email: z.string().trim().email("Введите корректный email."),
  password: z.string().min(6, "Пароль должен содержать минимум 6 символов."),
})

export const accountResponseSchema = z.object({
  email: z.string().email(),
  credits: z.number().int().nonnegative(),
})

export type AuthCredentials = z.infer<typeof authCredentialsSchema>
export type AccountResponse = z.infer<typeof accountResponseSchema>
