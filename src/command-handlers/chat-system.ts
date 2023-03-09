import { extract_parameters, get_redis_client } from '../utils'
import { get_whitelist } from './chat'

const handler: CommandHandler = async (ctx) => {
  const chat_whitelist = await get_whitelist()
  const chat_id = ctx.message.chat.id

  if (!chat_whitelist.includes(chat_id)) {
    ctx.reply('You shall not access', {
      reply_to_message_id: ctx.message.message_id,
      parse_mode: 'MarkdownV2',
    })
    return
  }

  const message = extract_parameters(ctx.message.text).join(' ')

  const reply_result = await ctx.reply(
    '<i>system content added successfully, reply this message to start the chat</i>',
    {
      reply_to_message_id: ctx.message.message_id,
      parse_mode: 'HTML',
    },
  )

  const client = get_redis_client()
  await client.set(
    `ntzyz-bot::chat-gpt::message_v2::${ctx.chat.id}::${reply_result.message_id}`,
    JSON.stringify({
      system: message,
    }),
  )
}

export default handler
