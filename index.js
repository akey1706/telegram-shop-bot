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

const SUPPORT_URL =
  "https://t.me/sumbylist_support_bot";

const BANNER_URL =
  "https://raw.githubusercontent.com/akey1706/sum_by_list_image/main/tg_banner.png";

const ADMIN_ID = 1387488821;

// =========================
// AMOCRM
// =========================

const AMO_PIPELINE_ID = 10931642;
const AMO_STATUS_ID = 85963450;
const AMO_PAID_STATUS_ID = 85963454;

// =========================
// ПОЛЯ AMOCRM
// =========================

const FIELD_DOMAIN = 854933;
const FIELD_TARIFF = 854927;
const FIELD_TELEGRAM_ID = 857115;
const FIELD_TELEGRAM_USERNAME = 855013;
const FIELD_PURCHASE_DATE = 857167;
const FIELD_TRIAL_END = 857873;

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
// AMOCRM
// =========================

// =========================
// AMOCRM
// =========================

// =========================
// AMOCRM
// =========================

async function createAmoLead(data) {

  try {

    console.log("=== CREATE AMO LEAD ===");
    console.log(data);

    let contactId = null;

    // =========================
    // ИЩЕМ КОНТАКТ
    // =========================

    try {

      const contactsResponse = await fetch(
        `https://${process.env.AMO_DOMAIN}.amocrm.ru/api/v4/contacts`,
        {
          method: "GET",

          headers: {
            Authorization: `Bearer ${process.env.AMO_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      const contactsText =
        await contactsResponse.text();

      console.log("CONTACT SEARCH:", contactsText);

      if (contactsResponse.ok) {

        const contactsData =
          JSON.parse(contactsText);

        const contacts =
          contactsData._embedded?.contacts || [];

        const foundContact =
          contacts.find((contact) => {

            const fields =
              contact.custom_fields_values || [];

            return fields.some((field) => {

              if (
                field.field_id !==
                FIELD_TELEGRAM_ID
              ) {
                return false;
              }

              return field.values?.some(
                (v) =>
                  String(v.value) ===
                  String(data.telegram_id)
              );

            });

          });

        if (foundContact) {

          contactId = foundContact.id;

          console.log(
            "FOUND CONTACT:",
            contactId
          );

        }

      }

    } catch (error) {

      console.log("CONTACT SEARCH ERROR");
      console.log(error);

    }

    // =========================
    // СОЗДАЕМ КОНТАКТ
    // =========================

    if (!contactId) {

      console.log(
        "CONTACT NOT FOUND. CREATING NEW"
      );

      const contactPayload = [
        {
          name:
            data.name ||
            "Telegram User",

          custom_fields_values: [

            // Telegram username
            {
              field_id:
                FIELD_TELEGRAM_USERNAME,

              values: [
                {
                  value:
                    data.username
                      ? `@${data.username}`
                      : "Не указан",
                },
              ],
            },

            // Telegram ID
            {
              field_id:
                FIELD_TELEGRAM_ID,

              values: [
                {
                  value: String(
                    data.telegram_id
                  ),
                },
              ],
            },

            // Телефон
            ...(data.phone
              ? [
                  {
                    field_code:
                      "PHONE",

                    values: [
                      {
                        value:
                          data.phone,
                      },
                    ],
                  },
                ]
              : []),
          ],
        },
      ];

      const contactResponse =
        await fetch(
          `https://${process.env.AMO_DOMAIN}.amocrm.ru/api/v4/contacts`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${process.env.AMO_ACCESS_TOKEN}`,

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              contactPayload
            ),
          }
        );

      const contactText =
        await contactResponse.text();

      console.log(
        "CONTACT STATUS:",
        contactResponse.status
      );

      console.log(
        "CONTACT RESPONSE:",
        contactText
      );

      if (!contactResponse.ok) {
        return null;
      }

      const contactData =
        JSON.parse(contactText);

      contactId =
        contactData._embedded
          .contacts[0].id;

      console.log(
        "NEW CONTACT:",
        contactId
      );

    }

    // =========================
    // ДАТЫ
    // =========================

    const today =
      new Date()
        .toISOString()
        .split("T")[0];

    const trialEnd =
      new Date(
        Date.now() +
          14 *
            24 *
            60 *
            60 *
            1000
      )
        .toISOString()
        .split("T")[0];

    // =========================
    // СОЗДАЕМ СДЕЛКУ
    // =========================

    const leadPayload = [
      {
        name:
          `${data.type === "trial"
            ? "TRIAL"
            : "ПОКУПКА"} - ${data.domain}`,

        pipeline_id:
          AMO_PIPELINE_ID,

        status_id:
          AMO_STATUS_ID,

        price: 0,

        custom_fields_values: [

          // Домен
          {
            field_id:
              FIELD_DOMAIN,

            values: [
              {
                value:
                  data.domain,
              },
            ],
          },

          // Тариф
          {
            field_id:
              FIELD_TARIFF,

            values: [
              {
                value:
                  data.tariff,
              },
            ],
          },

          // Дата
          {
            field_id:
              FIELD_PURCHASE_DATE,

            values: [
              {
                value: today,
              },
            ],
          },

          // Trial end
          ...(data.type === "trial"
            ? [
                {
                  field_id:
                    FIELD_TRIAL_END,

                  values: [
                    {
                      value:
                        trialEnd,
                    },
                  ],
                },
              ]
            : []),
        ],

        _embedded: {
          contacts: [
            {
              id: contactId,
            },
          ],
        },
      },
    ];

    const leadResponse =
      await fetch(
        `https://${process.env.AMO_DOMAIN}.amocrm.ru/api/v4/leads`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${process.env.AMO_ACCESS_TOKEN}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            leadPayload
          ),
        }
      );

    const leadText =
      await leadResponse.text();

    console.log(
      "LEAD STATUS:",
      leadResponse.status
    );

    console.log(
      "LEAD RESPONSE:",
      leadText
    );

    if (!leadResponse.ok) {
      return null;
    }

    const leadData =
      JSON.parse(leadText);

    return leadData._embedded
      .leads[0].id;

  } catch (error) {

    console.log("AMO ERROR:");
    console.log(error);

    return null;

  }

}

// =========================
// COMMANDS
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

  await ctx.replyWithPhoto(
    BANNER_URL,
    {
      caption,
      parse_mode: "HTML",

      reply_markup: {
        inline_keyboard: [
          [
            {
              text:
                "🌐 Перейти на сайт",
              url: WEBSITE_URL,
            },
          ],

          [
            {
              text: "💳 Купить",
              callback_data: "buy",
            },

            {
              text:
                "🧪 Получить Триал",
              callback_data:
                "trial",
            },
          ],

          [
            {
              text:
                "💬 Поддержка",
              url: SUPPORT_URL,
            },
          ],
        ],
      },
    }
  );

});

// =========================
// BUY
// =========================

bot.action("buy", async (ctx) => {

  await ctx.answerCbQuery();

  await ctx.reply(
    `💳 Выберите период подписки`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "1 месяц",
              callback_data:
                "period_1_month",
            },
          ],

          [
            {
              text: "6 месяцев",
              callback_data:
                "period_6_months",
            },
          ],

          [
            {
              text: "1 год",
              callback_data:
                "period_1_year",
            },
          ],
        ],
      },
    }
  );

});

// =========================
// PERIOD
// =========================

bot.action(
  /period_(.+)/,
  async (ctx) => {

    const period =
      ctx.match[1];

    userSelections[
      ctx.from.id
    ] = {
      waitingPhone: true,
      period,
    };

    await ctx.answerCbQuery();

    await ctx.reply(
`📱 Сначала отправьте номер телефона`,
      {
        reply_markup: {
          keyboard: [
            [
              {
                text:
                  "📞 Поделиться номером",
                request_contact: true,
              },
            ],
          ],

          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );

  }
);

// =========================
// TRIAL
// =========================

bot.action("trial", async (ctx) => {

  await ctx.answerCbQuery();

  userSelections[
    ctx.from.id
  ] = {
    waitingPhone: true,
    period: "trial",
  };

  await ctx.reply(
`📱 Сначала отправьте номер телефона`,
    {
      reply_markup: {
        keyboard: [
          [
            {
              text:
                "📞 Поделиться номером",
              request_contact: true,
            },
          ],
        ],

        resize_keyboard: true,
        one_time_keyboard: true,
      },
    }
  );

});

// =========================
// CONTACT
// =========================

bot.on("contact", async (ctx) => {

  const userData =
    userSelections[ctx.from.id];

  if (
    !userData ||
    !userData.waitingPhone
  ) {
    return;
  }

  userSelections[
    ctx.from.id
  ].waitingPhone = false;

  userSelections[
    ctx.from.id
  ].waitingDomain = true;

  userSelections[
    ctx.from.id
  ].phone =
    ctx.message.contact.phone_number;

  await ctx.reply(
`🌐 Теперь введите ваш домен amoCRM

Введите в формате:
company.amocrm.ru`,
    {
      reply_markup: {
        remove_keyboard: true,
      },
    }
  );

});

// =========================
// TEXT
// =========================

bot.on("text", async (ctx) => {

  if (
    ctx.message.text.startsWith("/")
  ) {
    return;
  }

  const userData =
    userSelections[ctx.from.id];

  // =========================
  // ВВОД ДОМЕНА
  // =========================

  if (
    userData &&
    userData.waitingDomain
  ) {

    const domain =
      ctx.message.text.trim();

    const domainRegex =
      /^[a-zA-Z0-9-]+\.amocrm\.ru$/;

    if (
      !domainRegex.test(domain)
    ) {

      return ctx.reply(
`❌ Неверный формат домена

Введите домен в формате:
company.amocrm.ru`
      );

    }

    userSelections[
      ctx.from.id
    ].waitingDomain = false;

    // =========================
    // TRIAL
    // =========================

    if (
      userData.period ===
      "trial"
    ) {

      await bot.telegram.sendMessage(
        ADMIN_ID,

`🧪 Новый Trial

👤 ${ctx.from.first_name}
🆔 ${ctx.from.id}

🌐 ${domain}`
      );

      await createAmoLead({
        type: "trial",
        domain,
        tariff: "trial",
        telegram_id:
          ctx.from.id,
        name:
          ctx.from.first_name,
        username:
          ctx.from.username,
        phone:
          userData.phone,
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

    const tariff =
      PRICES[userData.period];

    const leadId =
      await createAmoLead({
        type: "buy",
        domain,
        tariff: tariff.label,
        telegram_id:
          ctx.from.id,
        name:
          ctx.from.first_name,
        username:
          ctx.from.username,
        phone:
          userData.phone,
      });
      
      if (!leadId) {

  return ctx.reply(
`❌ Ошибка создания сделки в amoCRM`
  );

}

    let payment;

    try {

      payment =
        await checkout.createPayment(
          {
            amount: {
              value:
                tariff.amount.toFixed(
                  2
                ),

              currency: "RUB",
            },

            confirmation: {
              type: "redirect",
              return_url:
                WEBSITE_URL,
            },

            capture: true,

            description:
              `Оплата виджета — ${tariff.label}`,

            metadata: {
              telegram_id:
                ctx.from.id,

              domain:
                domain,

              tariff:
                userData.period,

              lead_id:
                leadId,
            },
          },

          Date.now().toString()
        );

    } catch (error) {

      console.log(
        "YOOKASSA ERROR:"
      );

      console.log(error);

      return ctx.reply(
`❌ Ошибка создания платежа ЮKassa

Проверь:
• Shop ID
• Secret Key
• Активирован ли магазин`
      );

    }

    const paymentLink =
      payment.confirmation
        .confirmation_url;

    await bot.telegram.sendMessage(
      ADMIN_ID,

`🛒 Новая заявка на покупку

👤 ${ctx.from.first_name}
🆔 ${ctx.from.id}

🌐 ${domain}

💎 Тариф:
${tariff.label}`
    );

    return ctx.reply(
`✅ Домен сохранён: ${domain}

💳 Для оплаты нажмите кнопку ниже`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text:
                  "💰 Оплатить",

                url:
                  paymentLink,
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

bot.command(
  "help",
  async (ctx) => {

    await ctx.reply(
`💬 Поддержка

${SUPPORT_URL}`
    );

  }
);

// =========================
// WEBHOOK YOOKASSA
// =========================

app.post(
  "/yookassa-webhook",
  async (req, res) => {

    try {

      const event =
        req.body;

      if (
        event.event ===
        "payment.succeeded"
      ) {

        const payment =
          event.object;

        const metadata =
          payment.metadata || {};

        const telegramId =
          metadata.telegram_id;

        const domain =
          metadata.domain;

        const tariff =
          metadata.tariff;

        const leadId =
          metadata.lead_id;

        // =========================
        // УВЕДОМЛЕНИЕ АДМИНУ
        // =========================

        await bot.telegram.sendMessage(
          ADMIN_ID,

`💰 Новая оплата

👤 Telegram ID:
${telegramId}

🌐 Домен:
${domain}

💎 Тариф:
${tariff}

💵 Сумма:
${payment.amount.value} RUB`
        );

        // =========================
        // ОБНОВЛЕНИЕ СТАТУСА
        // =========================

        if (leadId) {

          try {

            await fetch(
              `https://${process.env.AMO_DOMAIN}.amocrm.ru/api/v4/leads/${leadId}`,
              {
                method: "PATCH",

                headers: {
                  Authorization:
                    `Bearer ${process.env.AMO_ACCESS_TOKEN}`,

                  "Content-Type":
                    "application/json",
                },

                body: JSON.stringify({
                  status_id:
                    AMO_PAID_STATUS_ID,

                  pipeline_id:
                    AMO_PIPELINE_ID,
                }),
              }
            );

            console.log(
              "LEAD STATUS UPDATED"
            );

          } catch (error) {

            console.log(
              "STATUS UPDATE ERROR"
            );

            console.log(error);

          }

        }

        // =========================
        // УВЕДОМЛЕНИЕ КЛИЕНТУ
        // =========================

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

      console.log(
        "YOOKASSA WEBHOOK ERROR:"
      );

      console.log(error);

      res.status(500).send("ERROR");

    }

  }
);

// =========================
// WEBHOOK TELEGRAM
// =========================

app.use(
  bot.webhookCallback("/bot")
);

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, async () => {

  console.log("Bot started");

  const RENDER_URL =
    process.env.RENDER_EXTERNAL_URL;

  await bot.telegram.setWebhook(
    `${RENDER_URL}/bot`
  );

  console.log(
    "Webhook connected"
  );

});