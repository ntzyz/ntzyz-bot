import { get_redis_client } from '../utils'
import fetch from 'node-fetch'
import { randomBytes } from 'node:crypto'
import { bot_owner, chat_export_pages_origin, chat_snapshot_key } from '../config'

const handler: CommandHandler = async (ctx) => {
  if (ctx.from.id !== bot_owner && ctx.chat.type !== 'private') {
    await ctx.reply('You shall not access', {
      reply_to_message_id: ctx.message.message_id,
      parse_mode: 'MarkdownV2',
    })
    return
  }

  const client = get_redis_client()

  const history = [] as Array<{
    input: string
    output: string
    system?: string
  }>

  if (ctx.message.reply_to_message?.message_id) {
    let cursor = ctx.message.reply_to_message?.message_id
    let cursor_chat_id = ctx.message.chat.id

    for (;;) {
      try {
        const chat_history_item_text = await client.get(`ntzyz-bot::chat-gpt::message_v2::${cursor_chat_id}::${cursor}`)
        const chat_history_item = (await JSON.parse(chat_history_item_text)) as ChatGPT.ChatHistoryItem

        chat_history_item.id = cursor
        history.unshift({
          input: chat_history_item.input,
          output: chat_history_item.output,
          system: chat_history_item.system,
        })

        cursor = chat_history_item.reply_to_message_id

        if (chat_history_item.reply_to_chat_id) {
          cursor_chat_id = chat_history_item.reply_to_chat_id
        }
      } catch {
        break
      }
    }

    if (history.length === 0) {
      return
    }
  }

  const name = `${randomBytes(12).toString('hex')}.json`

  await fetch(`${chat_export_pages_origin}/api/store`, {
    body: JSON.stringify({
      key: chat_snapshot_key,
      name,
      data: history,
    }),
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
    },
  })

  await ctx.reply(
    `Export finished successfully, you can view the chat history here: ${chat_export_pages_origin}/?file=${name}`,
    {
      reply_to_message_id: ctx.message.message_id,
    },
  )
}

export default handler
