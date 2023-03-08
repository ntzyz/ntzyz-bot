import { extract_parameters, get_redis_client } from '../utils'

const handler: CommandHandler = async (ctx) => {
  if (ctx.chat.type !== 'private') {
    await ctx.reply('You can only erase chat history in private chat', {
      reply_to_message_id: ctx.message.message_id,
      parse_mode: 'MarkdownV2',
    })
    return
  }

  const client = get_redis_client()

  if (ctx.message.reply_to_message?.message_id) {
    let cursor = ctx.message.reply_to_message?.message_id
    let count = 0

    for (;;) {
      try {
        const chat_history_item_text = await client.get(`ntzyz-bot::chat-gpt::message_v2::${ctx.chat.id}::${cursor}`)
        const chat_history_item = (await JSON.parse(chat_history_item_text)) as ChatGPT.ChatHistoryItem

        await client.del(`ntzyz-bot::chat-gpt::message_v2::${ctx.chat.id}::${cursor}`)

        cursor = chat_history_item.reply_to_message_id
        count += 1
      } catch {
        break
      }
    }

    if (count === 0) {
      await ctx.reply(`Error: No message to erase.`, {
        reply_to_message_id: ctx.message.message_id,
      })
    } else {
      await ctx.reply(`Erase thread finished. Total messages deleted: ${count * 2}`, {
        reply_to_message_id: ctx.message.message_id,
      })
    }
  } else {
    const parameters = extract_parameters(ctx.message.text)
    if (parameters[0] !== 'confirm') {
      await ctx.reply(
        `Warning: this operation will delete all your chat history with ChatGPT. Please use <code>/chat_erase confirm</code> to confirm this action.`,
        {
          reply_to_message_id: ctx.message.message_id,
          parse_mode: 'HTML',
        },
      )
      return
    }

    const keys = await client.keys(`ntzyz-bot::chat-gpt::message_v2::${ctx.chat.id}::*`)

    for (const key of keys) {
      await client.del(key)
    }

    await ctx.reply(`Erase all finished. Total messages deleted: ${keys.length * 2}`, {
      reply_to_message_id: ctx.message.message_id,
    })
  }
}

export default handler
