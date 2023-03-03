import { extract_parameters, get_redis_client } from '../utils'
import { chat_whitelist as static_chat_whitelist } from '../config'
import { bot_owner } from '../config'
import { flush_whitelist } from './chat'

const handler: CommandHandler = async (ctx) => {
  if (ctx.message.from.id !== bot_owner) {
    ctx.reply('You shall not access', {
      reply_to_message_id: ctx.message.message_id,
    })
    return
  }

  const chat_id_text = extract_parameters(ctx.message.text)?.[0]

  if (!/^\d+$/.test(chat_id_text)) {
    ctx.reply('Invalid parameters', {
      reply_to_message_id: ctx.message.message_id,
    })
    return
  }

  const client = get_redis_client()
  let current_whitelist = [] as number[]
  try {
    const whitelist_json = await client.get(`ntzyz-bot::chat-gpt::whitelist`)
    if (!whitelist_json) {
      throw new Error('empty JSON')
    }
    current_whitelist = JSON.parse(whitelist_json)
  } catch {
    current_whitelist = static_chat_whitelist
  }

  current_whitelist.push(Number(chat_id_text))

  await client.set(`ntzyz-bot::chat-gpt::whitelist`, JSON.stringify(current_whitelist))
  await flush_whitelist()

  ctx.reply('Done', {
    reply_to_message_id: ctx.message.message_id,
  })
}

export default handler
