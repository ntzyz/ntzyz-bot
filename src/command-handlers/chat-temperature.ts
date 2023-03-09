import { extract_parameters, get_redis_client } from '../utils'

const handler: CommandHandler = async (ctx) => {
  const client = get_redis_client()
  const [value] = extract_parameters(ctx.message.text)

  if (!/^\d+(|\.\d+)$/.test(value)) {
    await ctx.reply(
      `Usage: /chat_temperature number\nFor more info, please refer to [Official Documentation](https://platform.openai.com/docs/api-reference/chat/create#chat/create-temperature)`,
      {
        reply_to_message_id: ctx.message.message_id,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      },
    )
    return
  }

  const temperature = Number(value)
  if (temperature < 0 || temperature > 2) {
    await ctx.reply(
      `Error: invalid value, temperature should between 0 and 2.\nFor more info, please refer to [Official Documentation](https://platform.openai.com/docs/api-reference/chat/create#chat/create-temperature)`,
      {
        reply_to_message_id: ctx.message.message_id,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      },
    )
    return
  }

  client.set(`ntzyz-bot::chat-gpt::config::${ctx.from.id}::temperature`, temperature)
  await ctx.reply(`Temperature updated successfully.`, {
    reply_to_message_id: ctx.message.message_id,
    parse_mode: 'Markdown',
  })
}

export default handler
