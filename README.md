# PULSE — Telegram Mini App Planner

Лёгкий планер действий для Telegram Mini App: неоновый UI, приоритеты Hot / Glow / Soft, прогресс дня, фокус-режим. Данные хранятся локально в `localStorage`.

## Стек

- `index.html` + `styles.css` + `app.js` — Mini App (без сборки)
- `bot.py` — кнопка, которая открывает WebApp

## Локальный просмотр

```bash
python3 -m http.server 8080
```

Открой `http://localhost:8080` в браузере. Внутри Telegram будет haptic + expand через `Telegram.WebApp`.

## Подключение к боту

1. Создай бота в [@BotFather](https://t.me/BotFather).
2. Залей Mini App на HTTPS (GitHub Pages, Cloudflare Pages, Vercel и т.п.).
3. В BotFather: `/newapp` → укажи URL на `index.html`.
4. Запусти бота:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export BOT_TOKEN="123:ABC"
export WEBAPP_URL="https://your-domain.example"
python bot.py
```

5. В Telegram: `/start` → **Открыть PULSE**.

## Возможности

- Добавление действий на выбранный день
- Приоритеты, фильтры, отметка выполнения
- Кольцо прогресса и режим «Фокус» (подсвечивает Hot)
- Сохранение между сессиями на устройстве
