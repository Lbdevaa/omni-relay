# omni-relay

Шлюз входящих сообщений для омниканальной поддержки: принимает переписку из мессенджеров,
приводит её к единому виду и гарантирует, что ни одно сообщение клиента не потеряется
и не задвоится.

## Задача

Клиенты пишут туда, где им удобно: Telegram, WhatsApp, ВКонтакте, почта, чат на сайте.
Для бизнеса это разные API с несовместимыми форматами, своими лимитами и своей моделью
ошибок — а менеджеру нужна одна лента переписок и одна кнопка «ответить».

Прослойка, которая это обеспечивает, кажется простой: принял вебхук, записал в базу, ответил.
Ровно так её обычно и пишут — и ровно поэтому в проде она ведёт себя плохо. Сообщения
задваиваются, теряются при перезапуске, а один некорректный апдейт останавливает весь поток.

omni-relay — реализация этой прослойки, спроектированная от отказов, а не от happy path.

## Что делает

- **Принимает** вебхуки мессенджеров с проверкой подлинности запроса и отвечает провайдеру
  немедленно, до какой-либо обработки
- **Нормализует** входящие апдейты: у каждого канала своя структура, внутри системы —
  одна модель сообщения, контакта и вложения
- **Сохраняет** переписку в PostgreSQL с гарантией, что повторная доставка того же события
  не создаст дубль
- **Отправляет** ответы обратно в исходный канал, соблюдая лимиты провайдера и корректно
  обрабатывая его отказы
- **Изолирует** сообщения, которые не удалось обработать, вместо того чтобы блокировать ими очередь
- **Сообщает о своём состоянии**: health-пробы, метрики потока и глубины очереди,
  сквозной идентификатор запроса в логах

## Архитектура

```
Telegram / VK / e-mail
        │  webhook
        ▼
┌───────────────────┐
│  ingress (NestJS) │  проверка подписи · ответ 200 сразу · публикация
└─────────┬─────────┘
          ▼
    ┌─────────────────────────────┐
    │ RabbitMQ  messages.incoming │───(N неудач)──▶ messages.dlq
    └─────────┬───────────────────┘
              ▼
┌────────────────────────┐
│  consumer (NestJS)     │  нормализация · идемпотентная запись
└─────────┬──────────────┘
          ▼
   ┌──────────────┐         ┌─────────────────────────────┐
   │  PostgreSQL  │         │ RabbitMQ  messages.outgoing │
   └──────────────┘         └─────────┬───────────────────┘
                                      ▼
                            ┌────────────────────┐
                            │  sender (NestJS)   │  rate limit · retry · backoff
                            └─────────┬──────────┘
                                      ▼
                              API мессенджера
```

**Стек:** NestJS · TypeScript · RabbitMQ (amqplib) · PostgreSQL · Docker Compose · Prometheus-метрики

## Инженерные решения и их причины

| Решение | Что было бы иначе |
|---|---|
| Приём и обработка разнесены очередью, вебхук подтверждается до записи в базу | провайдер ждёт ответа секунды; при таймауте он повторяет доставку — под нагрузкой это лавина дублей |
| Ручное подтверждение обработки (`ack`) вместо автоматического | перезапуск сервиса в момент обработки — и сообщение клиента исчезает бесследно |
| Уникальный ключ «канал + внешний id» и вставка через `ON CONFLICT` | доставка гарантируется как at-least-once, то есть дубли не аномалия, а норма протокола |
| Dead letter queue с ограниченным числом попыток и отложенным ретраем | одно сообщение, которое стабильно ломает обработчик, зацикливает очередь и останавливает весь поток |
| `prefetch` на консьюмере | без ограничения один процесс забирает всю очередь и упирается в память, а остальные простаивают |
| Ошибки провайдера разделены на «наши» и «его»: `4xx` — сразу в DLQ, `429` и `5xx` — повтор | ретраи заведомо невыполнимого запроса тратят лимит и маскируют ошибку в коде |
| `retry_after` из ответа провайдера уважается, backoff экспоненциальный с джиттером | синхронный ретрай всех воркеров создаёт второй всплеск ровно в момент, когда сервис на той стороне и так лежит |
| Таймаут на каждый исходящий запрос через `AbortController` | в Node у HTTP-запроса фактически нет таймаута по умолчанию: зависший коннект держит воркер бесконечно |
| Graceful shutdown: по `SIGTERM` перестать забирать из очереди, дообработать взятое, закрыть соединения | выкат новой версии превращается в потерю всего, что было в работе |
| Канал за интерфейсом адаптера (`parse` · `send` · `verify`) | добавление второго мессенджера иначе означает копию всей цепочки обработки |

## Запуск

```bash
cp .env.example .env      # заполнить токен бота и секрет вебхука
docker compose up -d      # PostgreSQL и RabbitMQ
npm ci && npm run migrate
npm run start:dev
```

Вебхук требует публичного адреса — локально поднимается туннелем (`cloudflared`, `ngrok`),
после чего регистрируется в провайдере вместе с секретом.

Панель RabbitMQ — `localhost:15672`, метрики — `/metrics`, состояние сервиса — `/health`.

— файл валиден
```
docker compose config
```
— start
```
docker compose up -d
```
— список
```
docker compose ps
```

Если что-то встанет в unhealthy:
```
docker compose logs postgres
docker inspect dev-rabbitmq-omni-relay --format '{{json .State.Health}}'
```

dev_secret_placeholder_at_least_32_chars
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Модуль и контроллер
```
npx nest g module ingress
npx nest g controller ingress/telegram --flat
```

## Три сущности Nest

### Контроллер
— точка входа HTTP. Он знает, на какой URL и метод отвечать, достаёт данные из запроса и возвращает ответ. Логики в нём не должно быть: принял, передал дальше, отдал результат.

### Провайдер (обычно сервис)
— где живёт логика. Внедряется в контроллер через конструктор.

### Модуль
— не папка и не «файл про модуль», а объявление состава: какие контроллеры и провайдеры существуют в этом куске приложения и что из него видно снаружи.

Guard
```
npx nest g guard ingress/telegram-secret --flat
```

Туннель
```
winget install Cloudflare.cloudflared
cloudflared tunnel --url http://localhost:3000 --protocol http2
```

Три окна:

Приложение — там крутится npm run start:dev
Туннель — там крутится cloudflared tunnel --url http://localhost:3000. Ответ вида - (https://drink-picture-seem-cameras.trycloudflare.com/)
Команды —
```
$token = (Select-String '^TELEGRAM_BOT_TOKEN=' .env).Line -replace '^TELEGRAM_BOT_TOKEN=',''

$secret = (Select-String '^TELEGRAM_WEBHOOK_SECRET=' .env).Line -replace '^TELEGRAM_WEBHOOK_SECRET=',''

$tunnel = "https://drink-picture-seem-cameras.trycloudflare.com/"

Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$token/setWebhook" -Body @{ url = "$tunnel/webhook/telegram"; secret_token = $secret; drop_pending_updates = $true }

```

## Сервис реализует два интерфейса жизненного цикла Nest:

Хук	Что делает
OnModuleInit	connect(RABBITMQ_URL) → createChannel() → объявление топологии
OnModuleDestroy	закрыть канал, затем соединение

Три типа exchange: direct — точное совпадение ключа; fanout — всем очередям, ключ игнорируется; topic — совпадение по шаблону с * (одно слово) и # (любое число слов). Берём topic, потому что ключи вида incoming.telegram, incoming.vk позволят одному консьюмеру подписаться на incoming.#, а другому — только на свой канал.

### durable и persistent

durable: true у очереди означает, что переживёт рестарт брокера её описание. Чтобы пережили сообщения, нужен persistent: true при публикации. Классическая ошибка — поставить первое, забыть второе: после перезапуска очередь на месте, а пустая.

RabbitMQ и PostgreSQL

### Первая миграция
```
npm run migration:generate -- src/database/migrations/InitSchema
```

```
npm run migration:run
```

Проверить типы
```
npx tsc --noEmit
```

consumer — объявить состав
```
npx nest g module consumer
npx nest g service consumer/consumer --flat
```

контакт останется один
```
docker compose exec postgres psql -U omni -d omni_db -c "select m.direction, m.text, m.external_id, c.display_name from messages m join contacts c on c.id = m.contact_id order by m.created_at desc limit 5;"
```

```
docker compose exec postgres psql -U omni -d omni_db -c "select (select count(*) from contacts) as контактов, (select count(*) from messages) as сообщений;"
```

Смена очереди
```
docker compose exec rabbitmq rabbitmqctl delete_queue messages.incoming
```