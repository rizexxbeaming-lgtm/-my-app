"""
Лёгкий Telegram-бот, который открывает Mini App PULSE.

1. Создай бота у @BotFather
2. /newapp → укажи HTTPS URL на index.html (GitHub Pages / любой хостинг)
3. export BOT_TOKEN=... WEBAPP_URL=https://your-host/...
4. pip install -r requirements.txt && python bot.py
"""

from __future__ import annotations

import os

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes


BOT_TOKEN = os.environ.get("BOT_TOKEN", "")
WEBAPP_URL = os.environ.get("WEBAPP_URL", "").rstrip("/")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message:
        return

    if not WEBAPP_URL:
        await update.message.reply_text(
            "PULSE почти готов. Задай WEBAPP_URL на хост с index.html."
        )
        return

    keyboard = InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton(
                    text="Открыть PULSE",
                    web_app=WebAppInfo(url=WEBAPP_URL),
                )
            ]
        ]
    )
    await update.message.reply_text(
        "PULSE — неоновый планер действий.\nЖми кнопку и собирай день.",
        reply_markup=keyboard,
    )


def main() -> None:
    if not BOT_TOKEN:
        raise SystemExit("Задай BOT_TOKEN в окружении.")

    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
