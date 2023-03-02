import { Telegraf } from 'telegraf'
import { bot_token, webhook_prefix } from './config'
import command_handlers from './command-handlers'
import webhook_handlers from './webhook-handlers'
import { genshin_resin_alert_interval } from './cronjob/genshin-resin-alert'
import { genshin_resin_daily_notification } from './cronjob/genshin-resin-daily-notification'
import { get_http_server } from './utils'

const bot = new Telegraf(bot_token)
const http_server = get_http_server()
const me = await bot.telegram.getMe()

bot.use(function (ctx, next) {
  if ((((ctx.message as any)?.text as string) || '').charAt(0) === '/') {
    console.log(
      `FROM=${ctx.from.first_name}<${ctx.from.id}>; CHAT=${(ctx.chat as any).first_name || (ctx.chat as any).title}<${
        ctx.chat.id
      }>; CHAT_TYPE=${ctx.chat.type}; TXT=${(ctx.message as any)?.text}`,
    )
  }

  if ((ctx.message as any)?.reply_to_message?.from?.id === me.id) {
    ;(command_handlers.chat as any)(ctx)
  }

  next()
})

bot.command('id', command_handlers.id)
bot.command('echo', command_handlers.echo)
bot.command('aqi', command_handlers.aqi)
bot.command('nmid', command_handlers.download_music)
bot.command('hhsh', command_handlers.hhsh)
bot.command('resin', command_handlers.genshin_resin)
bot.command('box', command_handlers.genshin_box)
bot.command('my', command_handlers.genshin_my)
bot.command('events', command_handlers.genshin_events)
bot.command('alert', command_handlers.genshin_alert)
bot.command('daily_notification', command_handlers.genshin_daily_notification)
bot.command('recover', command_handlers.genshin_recover)
bot.command('chat', command_handlers.chat)

http_server.post('/:receiverId', (req, res) => webhook_handlers.notification_v1(bot, req, res))
http_server.post('/v2/updown-bot/:receiverId', (req, res) => webhook_handlers.notification_v2_updown(bot, req, res))
http_server.post('/v2/telegraf/:receiverId', (req, res) => webhook_handlers.notification_v2_telegraf(bot, req, res))

function run_all_cron_jobs() {
  genshin_resin_alert_interval(bot).catch(console.error)
  genshin_resin_daily_notification(bot).catch(console.error)
}

// run_all_cron_jobs()
// setInterval(() => run_all_cron_jobs(), 1000 * 60 * 4)

if (process.env.NODE_ENV === 'production') {
  const secret_path = `/telegraf/${bot.secretPathComponent()}`
  bot.telegram.setWebhook(`${webhook_prefix}${secret_path}`)
  http_server.use(bot.webhookCallback(secret_path))
} else {
  bot.launch()
}
