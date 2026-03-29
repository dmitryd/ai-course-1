# IMDB Movie Advisor

Локальный сервис на Next.js, который ищет фильм в IMDB через RapidAPI и выдаёт краткую рекомендацию на русском языке через Gemini.

## Запуск

1. Установите зависимости:

```bash
npm install
```

2. Создайте `.env.local` на основе `.env.example` и заполните ключи.

3. Запустите проект:

```bash
npm run dev
```

4. Откройте `http://localhost:3000`.

## Проверки

```bash
npm run lint
npm run test
npm run build
```

## Деплой на Vercel

Проект уже совместим с бесплатным аккаунтом Vercel. API-роут работает в `Node.js` runtime и использует только server-side переменные окружения.

Что проверить перед деплоем:

1. В Vercel укажи `Root Directory`, если подключаешь весь родительский репозиторий.
   Для этого проекта корневая папка должна быть `lesson03-imdb`.
2. Добавь переменные окружения:
   - `RAPIDAPI_KEY`
   - `RAPIDAPI_HOST`
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL_ID`
3. Значение `RAPIDAPI_HOST` должно быть:

```dotenv
imdb236.p.rapidapi.com
```

4. Значение `GEMINI_MODEL_ID` по текущей реализации должно быть:

```dotenv
gemini-3.1-flash-lite-preview
```

5. Перед деплоем локально полезно прогнать:

```bash
npm run test
npm run build
```

После этого можно деплоить без дополнительных конфигов `vercel.json`.
