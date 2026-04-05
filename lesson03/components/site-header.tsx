import { AuthStatus } from "@/components/auth/auth-status"

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pt-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 rounded-[28px] border border-white/50 bg-white/60 px-5 py-5 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">YouTube Summary</p>
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Получайте краткое содержание роликов по ссылке</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Авторизация через Supabase открывает баланс кредитов, а один кредит соответствует разбору одного видео.
          </p>
        </div>
        <AuthStatus />
      </div>
    </header>
  )
}
