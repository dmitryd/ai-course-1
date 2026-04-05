# YouTube Video Summarizer

Приложение принимает ссылку на YouTube, получает расшифровку через Supadata, собирает краткое содержание через Gemini и теперь работает только для авторизованных пользователей с кредитами в Supabase.

## Что добавлено

- Регистрация и вход по `email + password` через Supabase Auth.
- Автоматическое начисление `5` кредитов при первой регистрации.
- Показ текущего баланса и кнопка выхода в интерфейсе.
- Списание `1` кредита за запуск обработки одного видео.
- Временное пополнение до `5` кредитов при повторном входе, если баланс уже пустой.

Временное пополнение выделено отдельными блоками с маркерами `TEMPORARY LOGIN REFILL`:

- `lib/credits.ts`
- `app/api/auth/login-bootstrap/route.ts`
- `supabase/migrations/20260405173000_auth_and_credits.sql`

## Переменные окружения

Создайте [`.env.local`](.env.local) в корне проекта:

```dotenv
SUPADATA_API_KEY=your_supadata_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
APP_JOB_TOKEN_SECRET=replace_with_a_long_random_secret
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## Настройка Supabase

1. Создайте Supabase project.
2. Отключите подтверждение email: `Authentication -> Providers -> Email -> Confirm email`.
3. Примените SQL-миграцию из `supabase/migrations/20260405173000_auth_and_credits.sql` через Supabase SQL Editor, CLI или MCP.
4. Скопируйте `Project URL` и `anon public key` в `.env.local`.

Миграция создает:

- таблицу `public.user_credits`
- триггер на `auth.users` для стартовых 5 кредитов
- функции `ensure_user_credits`, `consume_credit`
- временную функцию `temporarily_refill_credits_on_login_if_empty`

## Локальный запуск

1. Скопируйте [`.env.example`](.env.example) в [`.env.local`](.env.local).
2. Заполните ключи Supadata, Gemini и Supabase.
3. Выполните `npm install`.
4. Выполните `npm run dev`.
5. Откройте `http://localhost:3000`.

## Тесты

- Запуск всех тестов: `npm test`
- Линтинг: `npm run lint`

## Что важно для дальнейшего удаления временного поведения

Чтобы убрать пополнение кредитов при повторном входе позже, достаточно:

1. удалить вызов и helper `applyTemporaryLoginCreditRefill` из `lib/credits.ts`
2. удалить маршрут `app/api/auth/login-bootstrap/route.ts`
3. убрать вызов `/api/auth/login-bootstrap` из `components/providers/auth-provider.tsx`
4. удалить SQL-блок `TEMPORARY LOGIN REFILL` из `supabase/migrations/20260405173000_auth_and_credits.sql`
