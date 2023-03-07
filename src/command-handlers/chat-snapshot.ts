import { get_redis_client } from '../utils'
import { chat_snapshot_key } from '../config'
import { createCipheriv, createHash, randomBytes } from 'node:crypto'

const handler: CommandHandler = async (ctx) => {
  if (ctx.chat.type !== 'private') {
    ctx.reply('Error: This command can only be invoked in private chat.', {
      reply_to_message_id: ctx.message.message_id,
    })
    return
  }

  if (!ctx.message.reply_to_message?.message_id) {
    ctx.reply('Error: Please reply to the message which you want to take snapshot.', {
      reply_to_message_id: ctx.message.message_id,
    })
    return
  }

  const client = get_redis_client()

  try {
    const json = await client.get(
      `ntzyz-bot::chat-gpt::message_v2::${ctx.chat.id}::${ctx.message.reply_to_message.message_id}`,
    )
    if (!json) {
      throw new Error('empty chat history')
    }
  } catch {
    ctx.reply('Error: Failed to locate the message to snapshot. Please make sure the message is a reply from ChatGPT', {
      reply_to_message_id: ctx.message.message_id,
    })
    return
  }

  const iv = randomBytes(16)
  const key = Buffer.from(chat_snapshot_key, 'hex')

  const cipher = createCipheriv('aes-256-gcm', key, iv)

  const snapshot_plain_text = JSON.stringify({
    chat_id: ctx.chat.id,
    message_id: ctx.message.reply_to_message.message_id,
  })

  let encrypted = cipher.update(snapshot_plain_text, 'utf-8', 'hex')
  encrypted += cipher.final('hex')

  const auth_tag = cipher.getAuthTag()

  ctx.reply(
    `Snapshot was taken successfully:\n\n<code>${auth_tag.toString('hex')}:${iv.toString(
      'hex',
    )}:${encrypted}</code>\n\nUse /chat_restore to continue this ChatGPT thread in another chat.`,
    {
      reply_to_message_id: ctx.message.message_id,
      parse_mode: 'HTML',
    },
  )
}

export default handler
