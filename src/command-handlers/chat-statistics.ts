import { extract_parameters, get_redis_client } from '../utils'

const handler: CommandHandler = async (ctx) => {
  const client = get_redis_client()

  if (ctx.message.reply_to_message?.message_id) {
    let cursor = ctx.message.reply_to_message?.message_id
    let count = 0
    let token_count = 0

    for (;;) {
      try {
        const chat_history_item_text = await client.get(`ntzyz-bot::chat-gpt::message_v2::${ctx.chat.id}::${cursor}`)
        const chat_history_item = (await JSON.parse(chat_history_item_text)) as ChatGPT.ChatHistoryItem

        cursor = chat_history_item.reply_to_message_id
        count += 1
        token_count += chat_history_item.token
      } catch {
        break
      }
    }

    if (count === 0) {
      await ctx.reply(`Error: Empty history.`, {
        reply_to_message_id: ctx.message.message_id,
      })
    } else {
      await ctx.reply(
        `Statistics for this thread:\n- Message count: ${count * 2}.\n- Total token used: ${token_count}.`,
        {
          reply_to_message_id: ctx.message.message_id,
        },
      )
    }
  } else {
    const keys = await client.keys(`ntzyz-bot::chat-gpt::message_v2::${ctx.chat.id}::*`)
    let count = 0
    let token_count = 0

    if (keys.length === 0) {
      await ctx.reply(`Error: Empty history.`, {
        reply_to_message_id: ctx.message.message_id,
      })
      return
    }

    for (const key of keys) {
      try {
        const chat_history_item_text = await client.get(key)
        const chat_history_item = (await JSON.parse(chat_history_item_text)) as ChatGPT.ChatHistoryItem

        count += 1
        token_count += chat_history_item.token
      } catch {
        break
      }
    }

    const message =
      ctx.chat.type === 'private' ? 'Statistics for all your chats' : 'Statistics for all chats in this group'
    await ctx.reply(`${message}:\n- Message count: ${count * 2}.\n- Total token used: ${token_count}.`, {
      reply_to_message_id: ctx.message.message_id,
    })
  }
}

export default handler
