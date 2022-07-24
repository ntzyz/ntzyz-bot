import fetch from 'node-fetch'
import { GENSHIN_DAILY_NOTIFICATION_LAST_SENT_AT, GENSHIN_DAILY_NOTIFICATION_TELEGRAM_UID_KEY, GENSHIN_DAILY_NOTIFICATION_TRIGGER_TIME } from '../cronjob/genshin-resin-daily-notification'
import { digest_mihoyo_ds, extract_parameters, get_redis_client, query_genshin_info } from '../utils'

const handler: CommandHandler = async (ctx) => {
  const parameters = extract_parameters(ctx.message.text)
  const redis = get_redis_client()
  const uid_list = ((await redis.get(GENSHIN_DAILY_NOTIFICATION_TELEGRAM_UID_KEY)) || '')
    .split(',')
    .map(Number)
    .filter((uid) => !!uid)
  const user_info = query_genshin_info(ctx.from.id)

  switch (parameters[0]) {
    case 'enable':
      {
        if (!user_info) {
          ctx.reply('Error: missing essential info (HoyoLab Cookie, etc).', {
            reply_to_message_id: ctx.message.message_id,
          })
          return
        }
        if (uid_list.includes(ctx.from.id)) {
          ctx.reply('你已经在车上了', { reply_to_message_id: ctx.message.message_id })
          return
        }
        if (!/^\d+:\d+$/.test(parameters[1])) {
          ctx.reply('Error: invalid trigger time.', { reply_to_message_id: ctx.message.message_id })
          return
        }
        uid_list.push(ctx.from.id)

        await redis.set(GENSHIN_DAILY_NOTIFICATION_TELEGRAM_UID_KEY, uid_list.join(','))
        await redis.set(`${GENSHIN_DAILY_NOTIFICATION_TRIGGER_TIME}::${ctx.from.id}`, parameters[1])

        ctx.reply(`加入成功（UID：${user_info.uid}）`, { reply_to_message_id: ctx.message.message_id })
      }
      break
    case 'disable':
      {
        if (uid_list.includes(ctx.from.id)) {
          await redis.set(GENSHIN_DAILY_NOTIFICATION_TELEGRAM_UID_KEY, uid_list.filter((id) => id !== ctx.from.id).join(','))
          ctx.reply(`退订成功`, { reply_to_message_id: ctx.message.message_id })
          return
        }
        ctx.reply('没事别玩 bot 谢谢', { reply_to_message_id: ctx.message.message_id })
      }
      break
    case 'status':
      {
        if (uid_list.includes(ctx.from.id)) {
          const last_sent_at = await redis.get(`${GENSHIN_DAILY_NOTIFICATION_LAST_SENT_AT}::${ctx.from.id}`)
          const trigger_time = await redis.get(`${GENSHIN_DAILY_NOTIFICATION_TRIGGER_TIME}::${ctx.from.id}`)
          ctx.reply([
            `日报设定时间：${trigger_time}`,
            `最后发送日期：${last_sent_at || 'never'}`,
          ].join('\n'), { reply_to_message_id: ctx.message.message_id })
        } else {
          ctx.reply('没有开启报警或没有米游社 Cookie！', { reply_to_message_id: ctx.message.message_id })
        }
      }
      break
    default:
      ctx.reply('Usage: /daily_notification (enable HH:MM|disable|status)', {
        reply_to_message_id: ctx.message.message_id,
        disable_web_page_preview: true,
      })
  }
}

export default handler
