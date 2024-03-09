import { extract_parameters, get_redis_client } from '../utils'

const handler: CommandHandler = async (ctx) => {
  const client = get_redis_client()
  const [value] = extract_parameters(ctx.message.text)
  const available_openai_models = [
    'gpt-4',
    'gpt-4-0613',
    'gpt-4-32k',
    'gpt-4-32k-0613',
    'gpt-4-1106-preview',
    'gpt-4-vision-preview',
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-0613',
    'gpt-3.5-turbo-16k',
    'gpt-3.5-turbo-16k-0613'
  ];
  const available_claude_models = [
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229'
  ];

  if (![...available_openai_models, ...available_claude_models].includes(value)) {
    const current_model = (await client.get(`ntzyz-bot::chat-gpt::config::${ctx.from.id}::model`)) || 'gpt-3.5-turb';
    await ctx.reply(
      [
        'Usage: /chat_model model_name',
        '',
        `Current model: <code>${current_model}</code>`,
        '',
        `Available <a href="https://platform.openai.com/docs/models/model-endpoint-compatibility">OpenAI models</a>:\n${available_openai_models.map(model => `• <code>${model}</code>`).join('\n')}`,
        '',
        `Available <a href="https://docs.anthropic.com/claude/docs/models-overview">Claude models</a>:\n${available_claude_models.map(model => `• <code>${model}</code>`).join('\n')}`,
      ].join('\n'),
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
