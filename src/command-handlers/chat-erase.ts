import { extract_parameters, get_redis_client } from '../utils'

const handler: CommandHandler = async (ctx) => {
  if (ctx.chat.type !== 'private') {
    await ctx.reply('You can only erase chat history in private chat', {
      reply_to_message_id: ctx.message.message_id,
      parse_mode: 'MarkdownV2',
    })
    return
  }

  const parameters = extract_parameters(ctx.message.text)
  if (parameters[0] !== 'confirm') {
    await ctx.reply(`Please use <code>/chat_erase confirm</code> to confirm this action.`, {
      reply_to_message_id: ctx.message.message_id,
      parse_mode: 'HTML',
    })
    return
  }

  const client = get_redis_client()

  const keys = await client.keys(`ntzyz-bot::chat-gpt::message_v2::${ctx.chat.id}::*`)

  for (const key of keys) {
    await client.del(key)
  }

  await ctx.reply(`Erase finished. Total chat deleted: ${keys.length}`, {
    reply_to_message_id: ctx.message.message_id,
  })
}

export default handler
