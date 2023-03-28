import { extract_parameters, get_redis_client } from '../utils'

const handler: CommandHandler = async (ctx) => {
  const client = get_redis_client()
  const [value] = extract_parameters(ctx.message.text)

  if (!value) {
    await ctx.reply(
      `Usage: /chat_verbose (on|off)\nIf enabled, the bot will reply with verbose information while generating the response.`,
      {
        reply_to_message_id: ctx.message.message_id,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      },
    )
    return
  }

  if (!['on', 'off'].includes(value)) {
    await ctx.reply(`Error: invalid value, should be \`on\` or \`off\`.`, {
      reply_to_message_id: ctx.message.message_id,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    })
    return
  }

  client.set(`ntzyz-bot::chat-gpt::config::${ctx.from.id}::verbose`, value)
  await ctx.reply(`Verbose updated successfully.`, {
    reply_to_message_id: ctx.message.message_id,
    parse_mode: 'Markdown',
  })
}

export default handler
