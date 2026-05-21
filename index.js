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

const ADMIN_ID = 1387488821;

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

Виджет автоматически считает сумму по любым числовым полям сделок.

━━━━━━━━━━━━━━━

💎 <b>Тарифы</b>

🧪 Триал 14 дней — Бесплатно
💼 1 месяц — 299 ₽
🚀 6 месяцев — 1499 ₽
👑 1 год — 2999 ₽

━━━━━━━━━━━━━━━

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
            url: SUPPORT_URL,
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

  if (userData.waitingDomain) {

    const domain = ctx.message.text.trim();

    const domainRegex = /^[a-zA-Z0-9-]+\.amocrm\.ru$/;

    if (!domainRegex.test(domain)) {

      return ctx.reply(
`❌ Неверный формат домена

Введите домен в формате:
company.amocrm.ru`
      );
    }

    userSelections[ctx.from.id].waitingDomain = false;
    userSelections[ctx.from.id].domain = domain;

    // =========================
    // TRIAL
    // =========================

    if (userData.period === "trial") {

      // Уведомление тебе
      await bot.telegram.sendMessage(
        ADMIN_ID,

`🧪 Новый Trial

👤 ${ctx.from.first_name}
🆔 ${ctx.from.id}

🌐 ${domain}`
      );

      // Отправка в Albato
      await fetch(
        "https://h.albato.ru/wh/38/1lfdb3f/0n1CVMbvadYQAsKvEx5ZoF1KGvNgdSDEtznWLZBxWu4/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            type: "trial",
            domain: domain,
            tariff: "trial",
            telegram_id: ctx.from.id,
            username: ctx.from.username,
            name: ctx.from.first_name
          })
        }
      );

      return ctx.reply(
`✅ Ваш trial для домена:

${domain}

будет активирован в ближайшее время.`
      );
    }

    // =========================
    // BUY
    // =========================

    await bot.telegram.sendMessage(
      ADMIN_ID,

`🛒 Новая покупка

👤 ${ctx.from.first_name}
🆔 ${ctx.from.id}

🌐 ${domain}

💎 Тариф:
${userData.period}`
    );

    await fetch(
      "https://h.albato.ru/wh/38/1lfdb3f/0n1CVMbvadYQAsKvEx5ZoF1KGvNgdSDEtznWLZBxWu4/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          type: "buy",
          domain: domain,
          tariff: userData.period,
          telegram_id: ctx.from.id,
          username: ctx.from.username,
          name: ctx.from.first_name
        })
      }
    );

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

${SUPPORT_URL}`
  );

});

// =========================
// MENU
// =========================

bot.telegram.setMyCommands([
  {
    command: "start",
    description: "Открыть меню"
  },

  {
    command: "help",
    description: "Поддержка"
  }
]);

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

// =========================
// KEY
// =========================

bot.command("key", async (ctx) => {

  if (ctx.from.id !== ADMIN_ID) {
    return;
  }

  const args = ctx.message.text.split(" ");

  const userId = args[1];
  const key = args.slice(2).join(" ");

  if (!userId || !key) {

    return ctx.reply(
`Использование:

/key USER_ID КЛЮЧ`
    );
  }

  await bot.telegram.sendMessage(
    userId,

`🔑 Ваш лицензионный ключ:

${key}`
  );

  ctx.reply("✅ Ключ отправлен");

});

// =========================
// ACTIVATE
// =========================

bot.command("activate", async (ctx) => {

  if (ctx.from.id !== ADMIN_ID) {
    return;
  }

  const args = ctx.message.text.split(" ");

  const userId = args[1];

  if (!userId) {

    return ctx.reply(
`Использование:

/activate USER_ID`
    );
  }

  await bot.telegram.sendMessage(
    userId,

`✅ Ваш trial активирован`
  );

  ctx.reply("✅ Клиент уведомлен");

});