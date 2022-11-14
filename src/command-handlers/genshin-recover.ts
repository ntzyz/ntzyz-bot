import { GENSHIN_POLLING_USER_IS_PAUSED } from '../cronjob/genshin-resin-alert'
import { get_redis_client, query_genshin_info } from '../utils'

const handler: CommandHandler = async (ctx) => {
  const redis = get_redis_client()
  const user_info = query_genshin_info(ctx.from.id)
  if (!user_info) {
    ctx.reply('Error: missing essential info (HoyoLab Cookie, etc).', {
      reply_to_message_id: ctx.message.message_id,
    })
    return
  }

  if ((await redis.get(`${GENSHIN_POLLING_USER_IS_PAUSED}::${user_info.uid}`)) !== 'true') {
    ctx.reply('Error: no need to recover', {
      reply_to_message_id: ctx.message.message_id,
    })
    return
  }

  await redis.del(`${GENSHIN_POLLING_USER_IS_PAUSED}::${user_info.uid}`)

  ctx.reply('Recover OK.', {
    reply_to_message_id: ctx.message.message_id,
    disable_web_page_preview: true,
    parse_mode: 'Markdown',
  })
}

export default handler
