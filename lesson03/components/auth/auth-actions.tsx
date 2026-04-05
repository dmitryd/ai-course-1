"use client"

import { useState } from "react"

import { useAuth } from "@/components/providers/auth-provider"
import { AuthForm } from "@/components/auth/auth-form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type AuthTab = "signup" | "signin"

export function AuthActions() {
  const { signIn, signUp } = useAuth()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<AuthTab>("signup")

  function openDialog(nextTab: AuthTab) {
    setTab(nextTab)
    setOpen(true)
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button variant="outline" onClick={() => openDialog("signup")}>
          Регистрация
        </Button>
        <Button onClick={() => openDialog("signin")}>Вход</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-white/40 bg-background/95 shadow-2xl backdrop-blur">
          <DialogHeader>
            <DialogTitle>Доступ к кратким содержаниям</DialogTitle>
            <DialogDescription>
              После первой регистрации пользователь получает 5 кредитов. Один кредит списывается за одно видео.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={tab} onValueChange={(value) => setTab(value as AuthTab)} className="gap-5">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signup">Регистрация</TabsTrigger>
              <TabsTrigger value="signin">Вход</TabsTrigger>
            </TabsList>

            <TabsContent value="signup">
              <AuthForm
                mode="signup"
                submitLabel="Создать аккаунт"
                description="Создайте аккаунт по email и паролю, чтобы сразу получить стартовые кредиты."
                onSubmit={async (credentials) => {
                  await signUp(credentials.email, credentials.password)
                  setOpen(false)
                }}
              />
            </TabsContent>

            <TabsContent value="signin">
              <AuthForm
                mode="signin"
                submitLabel="Войти"
                description="Войдите в аккаунт, чтобы увидеть текущий баланс и продолжить работу с видео."
                onSubmit={async (credentials) => {
                  await signIn(credentials.email, credentials.password)
                  setOpen(false)
                }}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}
