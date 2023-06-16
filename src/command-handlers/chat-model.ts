import { extract_parameters, get_redis_client } from '../utils'

const handler: CommandHandler = async (ctx) => {
  const client = get_redis_client()
  const [value] = extract_parameters(ctx.message.text)

  if (![
    'gpt-4',
    'gpt-4-0613',
    'gpt-4-32k',
    'gpt-4-32k-0613',
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-0613',
    'gpt-3.5-turbo-16k',
    'gpt-3.5-turbo-16k-0613'
  ].includes(value)) {
    await ctx.reply(
      `Usage: /chat_model model_name\nFor more info, please refer to <a href="https://platform.openai.com/docs/models/model-endpoint-compatibility">Official Documentation</a>`,
      {
        reply_to_message_id: ctx.message.message_id,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      },
    )
    return
  }

  client.set(`ntzyz-bot::chat-gpt::config::${ctx.from.id}::model`, value)
  await ctx.reply(`Model updated successfully.`, {
    reply_to_message_id: ctx.message.message_id,
    parse_mode: 'Markdown',
  })
}

export default handler
