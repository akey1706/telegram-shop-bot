const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

require("dotenv").config();

const express = require("express");
const { Telegraf } = require("telegraf");
const { YooCheckout } = require("@a2seven/yoo-checkout");

const app = express();

const bot = new Telegraf(process.env.BOT_TOKEN);

app.use(express.json());

// =========================
// YOOKASSA
// =========================

const checkout = new YooCheckout({
  shopId: process.env.YOOKASSA_SHOP_ID,
  secretKey: process.env.YOOKASSA_SECRET_KEY,
});

// =========================
// НАСТРОЙКИ
// =========================

const WEBSITE_URL = "https://akey1706.github.io/github.io/";

const SUPPORT_URL = "https://t.me/sumbylist_support_bot";

const BANNER_URL =
  "https://raw.githubusercontent.com/akey1706/sum_by_list_image/main/tg_banner.png";

const ADMIN_ID = 1387488821;

// Webhook Albato
const ALBATO_WEBHOOK =
  "https://h.albato.ru/wh/38/1lfdb3f/0n1CVMbvadYQAsKvEx5ZoF1KGvNgdSDEtznWLZBxWu4/";

// =========================
// ТАРИФЫ
// =========================

const PRICES = {
  "1_month": {
    amount: 299,
    label: "1 месяц",
  },

  "6_months": {
    amount: 1499,
    label: "6 месяцев",
  },

  "1_year": {
    amount: 2999,
    label: "1 год",
  },
};

// =========================
// ХРАНЕНИЕ СОСТОЯНИЙ
// =========================

const userSelections = {};

// =========================
// MENU COMMANDS
// =========================

bot.telegram.setMyCommands([
  {
    command: "start",
    description: "Открыть меню",
  },

  {
    command: "help",
    description: "Поддержка",
  },
]);

// =========================
// START
// =========================

bot.start(async (ctx) => {

  const caption = `
🔥 <b>Сумма по списку</b>

Виджет автоматически считает сумму по числовым полям сделок и показывает итог прямо в списке.

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
            url: SUPPORT_URL,
          },
        ],
      ],
    },
  });

});

// =========================
// BUY
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
// PERIOD
// =========================

bot.action(/period_(.+)/, async (ctx) => {

  const period = ctx.match[1];

  userSelections[ctx.from.id] = {
    waitingDomain: true,
    period,
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
    period: "trial",
  };

  await ctx.reply(
`🧪 Для получения trial введите ваш домен amoCRM

Введите в формате:
company.amocrm.ru`
  );

});

// =========================
// TEXT
// =========================

bot.on("text", async (ctx) => {

  // Игнорируем команды
  if (ctx.message.text.startsWith("/")) {
    return;
  }

  const userData = userSelections[ctx.from.id];

  // =========================
  // DOMAIN INPUT
  // =========================

  if (userData && userData.waitingDomain) {

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

    // =========================
    // TRIAL
    // =========================

    if (userData.period === "trial") {

      // Telegram уведомление
      await bot.telegram.sendMessage(
        ADMIN_ID,

`🧪 Новый Trial

👤 ${ctx.from.first_name}
🆔 ${ctx.from.id}

🌐 ${domain}`
      );

      // Albato webhook
      await fetch(ALBATO_WEBHOOK, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          type: "trial",

          domain: domain,

          tariff: "trial",

          telegram_id: ctx.from.id,

          username: ctx.from.username,

          first_name: ctx.from.first_name,
        }),

      });

      return ctx.reply(
`✅ Ваш trial для домена:

${domain}

будет активирован в ближайшее время.`
      );

    }

    // =========================
    // BUY
    // =========================

    const tariff = PRICES[userData.period];

    let payment;

    try {

      payment = await checkout.createPayment({

        amount: {
          value: tariff.amount.toFixed(2),
          currency: "RUB",
        },

        confirmation: {
          type: "redirect",
          return_url: WEBSITE_URL,
        },

        capture: true,

        description: `Оплата виджета — ${tariff.label}`,

        metadata: {
          telegram_id: ctx.from.id,
          domain: domain,
          tariff: userData.period,
        },

      }, Date.now().toString());

    } catch (error) {

      console.log("YOOKASSA ERROR:");
      console.log(error);

      return ctx.reply(
`❌ Ошибка создания платежа ЮKassa

Проверь:
• Shop ID
• Secret Key
• Активирован ли магазин`
      );

    }

    const paymentLink = payment.confirmation.confirmation_url;

    // Telegram уведомление
    await bot.telegram.sendMessage(
      ADMIN_ID,

`🛒 Новая покупка

👤 ${ctx.from.first_name}
🆔 ${ctx.from.id}

🌐 ${domain}

💎 Тариф:
${tariff.label}`
    );

    // Albato webhook
    await fetch(ALBATO_WEBHOOK, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        type: "buy",

        domain: domain,

        tariff: tariff.label,

        telegram_id: ctx.from.id,

        username: ctx.from.username,

        first_name: ctx.from.first_name,
      }),

    });

    return ctx.reply(
`✅ Домен сохранён: ${domain}

💳 Для оплаты нажмите кнопку ниже`,
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

  // =========================
  // ОБЫЧНЫЕ СООБЩЕНИЯ
  // =========================

  await bot.telegram.sendMessage(
    ADMIN_ID,

`💬 Новое сообщение

👤 ${ctx.from.first_name}
🆔 ${ctx.from.id}

✉️ ${ctx.message.text}`
  );

  return ctx.reply(
`✅ Сообщение отправлено в поддержку`
  );

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
// REPLY
// =========================

bot.command("reply", async (ctx) => {

  if (ctx.from.id !== ADMIN_ID) {
    return;
  }

  const args = ctx.message.text.split(" ");

  const userId = args[1];

  const message = args.slice(2).join(" ");

  if (!userId || !message) {

    return ctx.reply(
`Использование:

/reply USER_ID сообщение`
    );

  }

  await bot.telegram.sendMessage(
    userId,

`💬 Ответ поддержки:

${message}`
  );

  ctx.reply("✅ Ответ отправлен");

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

// =========================
// YOOKASSA WEBHOOK
// =========================

app.post("/yookassa-webhook", async (req, res) => {

  try {

    const event = req.body;

    if (event.event === "payment.succeeded") {

      const payment = event.object;

      const metadata = payment.metadata || {};

      const telegramId = metadata.telegram_id;
      const domain = metadata.domain;
      const tariff = metadata.tariff;

      // Уведомление тебе
      await bot.telegram.sendMessage(
        ADMIN_ID,

`💰 Успешная оплата

👤 Telegram ID:
${telegramId}

🌐 Домен:
${domain}

💎 Тариф:
${tariff}

💵 Сумма:
${payment.amount.value} RUB`
      );

      // Уведомление клиенту
      if (telegramId) {

        await bot.telegram.sendMessage(
          telegramId,

`✅ Оплата прошла успешно

🌐 Домен:
${domain}

💎 Тариф:
${tariff}

В ближайшее время вам будет отправлен лицензионный ключ.`
        );

      }

    }

    res.status(200).send("OK");

  } catch (error) {

    console.log("YOOKASSA WEBHOOK ERROR:");
    console.log(error);

    res.status(500).send("ERROR");

  }

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