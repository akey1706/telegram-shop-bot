const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
require("dotenv").config();

const express = require("express");
const { Telegraf } = require("telegraf");

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

app.use(express.json());

// =========================
// НАСТРОЙКИ
// =========================

const WEBSITE_URL = "https://akey1706.github.io/github.io/";

const SUPPORT_URL = "https://t.me/sumbylist_support_bot";

const BANNER_URL =
  "https://raw.githubusercontent.com/akey1706/sum_by_list_image/main/tg_banner.png";

// Ссылки на оплату
const PAYMENT_LINKS = {
  "1_month": "https://your-site.com/pay-1-month",
  "6_months": "https://your-site.com/pay-6-months",
  "1_year": "https://your-site.com/pay-1-year",
};

// =========================
// ХРАНЕНИЕ ДАННЫХ
// =========================

const userSelections = {};

// =========================
// START
// =========================

bot.start(async (ctx) => {
  const caption = `
🔥 <b>Сумма по списку</b>

Виджет «Сумма по списку» автоматически считает сумму по любым числовым полям сделок и отображает итог прямо в заголовке столбца.

Работает с фильтрами — меняете фильтр, сумма пересчитывается мгновенно.

━━━━━━━━━━━━━━━

💎 <b>Тарифы</b>

🧪 Триал 14 дней — Бесплатно
💼 1 месяц — 299 ₽
🚀 6 месяцев — 1499 ₽
👑 1 год — 2999 ₽

━━━━━━━━━━━━━━━

✅ Что входит:
• Полный доступ
• Поддержка
• Интеграции
• Обновления

👇 Выберите действие ниже
`;

  await ctx.replyWithPhoto(BANNER_URL, {
    caption,
    parse_mode: "HTML",

    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🌐 Перейти на сайт",
            url: WEBSITE_URL,
          },
        ],

        [
          {
            text: "💳 Купить",
            callback_data: "buy",
          },

          {
            text: "🧪 Получить Триал",
            callback_data: "trial",
          },
        ],

        [
          {
            text: "💬 Поддержка",
            callback_data: "support",
          },
        ],
      ],
    },
  });
});

// =========================
// КУПИТЬ
// =========================

bot.action("buy", async (ctx) => {
  await ctx.answerCbQuery();

  await ctx.reply(`💳 Выберите период подписки`, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "1 месяц",
            callback_data: "period_1_month",
          },
        ],

        [
          {
            text: "6 месяцев",
            callback_data: "period_6_months",
          },
        ],

        [
          {
            text: "1 год",
            callback_data: "period_1_year",
          },
        ],
      ],
    },
  });
});

// =========================
// ВЫБОР ПЕРИОДА
// =========================

bot.action(/period_(.+)/, async (ctx) => {
  const period = ctx.match[1];

  userSelections[ctx.from.id] = {
    period,
    waitingDomain: true,
  };

  await ctx.answerCbQuery();

  await ctx.reply(
`🌐 Введите ваш домен amoCRM

Введите в формате:
company.amocrm.ru`
  );
});

// =========================
// SUPPORT
// =========================

bot.action("support", async (ctx) => {
  await ctx.answerCbQuery();

  userSelections[ctx.from.id] = {
    waitingSupport: true,
  };

  await ctx.reply(
`💬 Напишите ваш вопрос одним сообщением.

Наш менеджер скоро ответит.`
  );
});

// =========================
// TRIAL
// =========================

bot.action("trial", async (ctx) => {

  await ctx.answerCbQuery();

  userSelections[ctx.from.id] = {
    waitingDomain: true,
    period: "trial"
  };

  await ctx.reply(
`🧪 Для получения trial введите ваш домен amoCRM

Введите в формате:
company.amocrm.ru`
  );

});

// =========================
// ОБРАБОТКА СООБЩЕНИЙ
// =========================

bot.on("text", async (ctx) => {
  const userData = userSelections[ctx.from.id];

  if (!userData) {
    return;
  }

  // =========================
  // SUPPORT
  // =========================

  if (userData.waitingSupport) {

    const supportMessage = ctx.message.text;

    await fetch("https://hook.eu1.make.com/movsz2g5rx0vmel6l684xopfto7aatbl", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    telegram_id: ctx.from.id,
    username: ctx.from.username,
    first_name: ctx.from.first_name,
    message: supportMessage,
    date: new Date().toISOString()
  })
});

userSelections[ctx.from.id].waitingSupport = false;

return ctx.reply(
`✅ Сообщение отправлено в поддержку`
);
  }

  // =========================
  // DOMAIN INPUT
  // =========================

  if (userData.waitingDomain) {

    const domain = ctx.message.text.trim();

    const domainRegex = /^[a-zA-Z0-9-]+\\.amocrm\\.ru$/;

    if (!domainRegex.test(domain)) {

      return ctx.reply(
`❌ Неверный формат домена

Введите домен в формате:
company.amocrm.ru`
      );
    }

    userSelections[ctx.from.id].waitingDomain = false;
    userSelections[ctx.from.id].domain = domain;

    const paymentLink = PAYMENT_LINKS[userData.period];

    return ctx.reply(
`✅ Домен сохранён: ${domain}

💳 Для оплаты перейдите по ссылке ниже`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "💰 Оплатить",
                url: paymentLink,
              },
            ],
          ],
        },
      }
    );
  }

});

// =========================
// HELP
// =========================

bot.command("help", async (ctx) => {

  await ctx.reply(
`💬 Поддержка

Если возникли вопросы:

📩 Telegram:
${SUPPORT_URL}`
  );

});

// =========================
// WEBHOOK
// =========================

app.use(bot.webhookCallback("/bot"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {

  console.log("Bot started");

  const RENDER_URL = process.env.RENDER_EXTERNAL_URL;

  await bot.telegram.setWebhook(`${RENDER_URL}/bot`);

  console.log("Webhook connected");

});