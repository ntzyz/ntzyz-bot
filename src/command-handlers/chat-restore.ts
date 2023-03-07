import { extract_parameters, get_redis_client } from '../utils'
import { chat_snapshot_key } from '../config'
import { createDecipheriv, createHash, randomBytes } from 'node:crypto'

const handler: CommandHandler = async (ctx) => {
  const [token] = extract_parameters(ctx.message.text)
  const [auth_tag, nonce, encrypted] = token.split(':')

  let chat_id: number, message_id: number

  try {
    const key = Buffer.from(chat_snapshot_key, 'hex')
    const iv = Buffer.from(nonce, 'hex')
    const decipher = createDecipheriv('aes-256-gcm', key, iv)

    decipher.setAuthTag(Buffer.from(auth_tag, 'hex'))

    let snapshot_plain_text = decipher.update(encrypted, 'hex', 'utf-8')
    snapshot_plain_text += decipher.final('utf-8')

    const snapshot = JSON.parse(snapshot_plain_text) as Record<'chat_id' | 'message_id', number>

    chat_id = snapshot.chat_id
    message_id = snapshot.message_id
  } catch (ex) {
    console.error(ex)
    ctx.reply('Error: Invalid token, please check.', {
      reply_to_message_id: ctx.message.message_id,
    })
    return
  }

  const reply_result = await ctx.reply(
    '<i>chat thread restored successfully, reply this message to continue the chat</i>',
    {
      reply_to_message_id: ctx.message.message_id,
      parse_mode: 'HTML',
    },
  )

  const client = get_redis_client()
  const old_chat_history_item_text = await client.get(`ntzyz-bot::chat-gpt::message_v2::${chat_id}::${message_id}`)
  const old_chat_history_item = JSON.parse(old_chat_history_item_text) as ChatGPT.ChatHistoryItem
  old_chat_history_item.reply_to_chat_id = chat_id
  await client.set(
    `ntzyz-bot::chat-gpt::message_v2::${ctx.chat.id}::${reply_result.message_id}`,
    JSON.stringify(old_chat_history_item),
  )
}

export default handler
