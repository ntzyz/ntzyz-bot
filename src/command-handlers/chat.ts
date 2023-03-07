import { extract_parameters, get_redis_client } from '../utils'
import fetch from 'node-fetch'
import { openai_api_token, chat_whitelist as static_chat_whitelist } from '../config'

const chat_gpt_token_limit = 4096
let chat_whitelist: number[] = null

export async function flush_whitelist(): Promise<void> {
  const client = get_redis_client()
  try {
    const whitelist_json = await client.get(`ntzyz-bot::chat-gpt::whitelist`)

    if (!whitelist_json) {
      throw new Error('empty JSON')
    }

    chat_whitelist = JSON.parse(whitelist_json)
  } catch {
    chat_whitelist = static_chat_whitelist
  }
}

const handler: CommandHandler = async (ctx) => {
  const chat_id = ctx.message.chat.id

  if (!chat_whitelist) {
    await flush_whitelist()
  }

  if (!chat_whitelist.includes(chat_id)) {
    ctx.reply('You shall not access', {
      reply_to_message_id: ctx.message.message_id,
      parse_mode: 'MarkdownV2',
    })
    return
  }

  const client = get_redis_client()
  const message = ctx.message.text[0] === '/' ? extract_parameters(ctx.message.text).join(' ') : ctx.message.text
  const history = [] as Array<{
    reply_to_message_id: number
    input: string
    output: string
    id: number
    token: number
  }>

  if (!message) {
    return
  }

  let total_token = 0
  if (ctx.message.reply_to_message?.message_id) {
    let cursor = ctx.message.reply_to_message?.message_id
    let cursor_chat_id = chat_id

    while (total_token <= chat_gpt_token_limit - 300) {
      try {
        const chat_history_item_text = await client.get(`ntzyz-bot::chat-gpt::message_v2::${cursor_chat_id}::${cursor}`)
        const chat_history_item = (await JSON.parse(chat_history_item_text)) as ChatGPT.ChatHistoryItem

        chat_history_item.id = cursor
        total_token += chat_history_item.token
        history.unshift(chat_history_item)

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

  let chat_gpt_reply: string = null
  let token_used: number = 0
  let action_flushed_times = 0
  let action_interval = setInterval(() => {
    action_flushed_times += 1
    if (chat_gpt_reply || action_flushed_times > 60) {
      clearInterval(action_interval)
      return
    }
    ctx.replyWithChatAction('typing')
  }, 1000)

  for (let retry = 0; ; ) {
    const messages = [
      ...history
        .map((item) => [
          { role: 'user', content: item.input },
          {
            role: 'assistant',
            content: item.output,
          },
        ])
        .flat(Infinity),
      {
        role: 'user',
        content: message,
      },
    ]

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openai_api_token}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
      }),
    })

    const data = (await response.json()) as any

    if (data.error?.code === 'context_length_exceeded' || data?.choices?.[0]?.finish_reason === 'length') {
      let unused_history = history.shift()
      total_token -= unused_history.token
      continue
    }

    if (data.error) {
      console.log('ERROR from OpenAI API: ', JSON.stringify(data, null, 2))
    }

    chat_gpt_reply = data?.choices?.[0]?.message?.content

    if (chat_gpt_reply) {
      token_used = data?.usage?.total_tokens
      break
    }

    if (retry >= 3) {
      chat_gpt_reply = '重试三次后也没有返回值, 放弃.'
      token_used = 0
      break
    }

    retry++
  }

  let reply_result: Awaited<ReturnType<typeof ctx.reply>>
  try {
    reply_result = await ctx.reply(chat_gpt_reply, {
      reply_to_message_id: ctx.message.message_id,
      parse_mode: 'MarkdownV2',
    })
  } catch {
    reply_result = await ctx.reply(chat_gpt_reply, {
      reply_to_message_id: ctx.message.message_id,
    })
  }

  await client.set(
    `ntzyz-bot::chat-gpt::message_v2::${chat_id}::${reply_result.message_id}`,
    JSON.stringify({
      reply_to_message_id: ctx.message.reply_to_message?.message_id,
      input: message,
      output: chat_gpt_reply,
      token: token_used - total_token,
    }),
  )
}

export default handler
