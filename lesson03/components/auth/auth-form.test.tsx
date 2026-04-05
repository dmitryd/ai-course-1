import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { AuthForm } from "@/components/auth/auth-form"

describe("AuthForm", () => {
  it("shows a validation error and prevents submission for invalid values", async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()

    render(
      <AuthForm
        mode="signup"
        submitLabel="Создать аккаунт"
        description="Тестовая форма"
        onSubmit={onSubmit}
      />,
    )

    await user.type(screen.getByLabelText("Email"), "member@example.com")
    await user.type(screen.getByLabelText("Пароль"), "123")
    await user.click(screen.getByRole("button", { name: "Создать аккаунт" }))

    expect(await screen.findByText("Пароль должен содержать минимум 6 символов.")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("submits email and password when the values are valid", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(
      <AuthForm mode="signin" submitLabel="Войти" description="Тестовая форма" onSubmit={onSubmit} />,
    )

    await user.type(screen.getByLabelText("Email"), "member@example.com")
    await user.type(screen.getByLabelText("Пароль"), "12345678")
    await user.click(screen.getByRole("button", { name: "Войти" }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: "member@example.com",
        password: "12345678",
      })
    })
  })
})
