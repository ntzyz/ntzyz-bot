import { extract_parameters, get_redis_client } from '../utils'
import fetch from 'node-fetch'
import { chat_export_pages_origin, chat_snapshot_key, openai_api_token, chat_whitelist as static_chat_whitelist } from '../config'
import { Message } from 'telegraf/typings/core/types/typegram'
import { extname } from 'node:path'

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

export async function get_whitelist() {
  if (!chat_whitelist) {
    await flush_whitelist()
  }

  return chat_whitelist
}

const handler: CommandHandler = async (ctx) => {
  const client = get_redis_client()
  const chat_id = ctx.message.chat.id

  if (
    ctx.message.reply_to_message?.message_id &&
    !(await client.exists(`ntzyz-bot::chat-gpt::message_v2::${chat_id}::${ctx.message.reply_to_message.message_id}`))
  ) {
    return
  }

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

  const message = (() => {
    if ('text' in ctx.message) {
      return ctx.message.text[0] === '/' ? extract_parameters(ctx.message.text).join(' ') : ctx.message.text
    }

    if ('photo' in ctx.message) {
      const text = (ctx.message as Message.PhotoMessage).caption || ''
      return text === '/' ? extract_parameters(text).join(' ') : text
    }
  })()
  let message_image_url: string

  const history = [] as Array<ChatGPT.ChatHistoryItem & { id: number }>
  let reply_result: Awaited<ReturnType<typeof ctx.reply>>

  if ('photo' in ctx.message) {
    const message = ctx.message as Message.PhotoMessage

    message.photo.sort((a, b) => b.height * b.width - a.height * a.width);

    const link = await ctx.telegram.getFileLink(message.photo[0].file_id)
    const link_url = link.toString()

    const image_blob_response = await fetch(link_url)
    const image_blob = await image_blob_response.arrayBuffer()
    const imageExtension = extname(link_url)

    const upload_filename = `${message.photo[0].file_unique_id}${imageExtension}`

    await fetch(`${chat_export_pages_origin}/api/image?key=${chat_snapshot_key}&name=${encodeURIComponent(upload_filename)}`, {
      body: Buffer.from(image_blob),
      method: 'PUT',
    })

    message_image_url = `${chat_export_pages_origin}/api/chat?file=${encodeURIComponent(upload_filename)}`
  }

  if (!message) {
    return
  }

  const temperature = Number((await client.get(`ntzyz-bot::chat-gpt::config::${ctx.from.id}::temperature`)) || '1')
  const model = (await client.get(`ntzyz-bot::chat-gpt::config::${ctx.from.id}::model`)) || 'gpt-3.5-turbo'
  const verbose = (await client.get(`ntzyz-bot::chat-gpt::config::${ctx.from.id}::verbose`)) === 'on'

  if (verbose) {
    reply_result = await ctx.reply('<i>grabbing chat history...</i>', {
      reply_to_message_id: ctx.message.message_id,
      parse_mode: 'HTML',
    })
  }

  let total_token = 0
  let system_chat_id: number = null
  let system_message_id: number = null
  let system_content: string = null

  if (ctx.message.reply_to_message?.message_id) {
    let cursor = ctx.message.reply_to_message?.message_id
    let cursor_chat_id = chat_id

    while (total_token <= chat_gpt_token_limit - 300) {
      try {
        const chat_history_item_text = await client.get(`ntzyz-bot::chat-gpt::message_v2::${cursor_chat_id}::${cursor}`)
        const chat_history_item = (await JSON.parse(chat_history_item_text)) as ChatGPT.ChatHistoryItem

        if ('system' in chat_history_item) {
          system_content = chat_history_item.system
          system_chat_id = cursor_chat_id
          system_message_id = cursor
          break
        }

        if (typeof chat_history_item.token !== 'number') {
          chat_history_item.token = 0
        }

        chat_history_item.id = cursor
        total_token += chat_history_item.token
        history.unshift(chat_history_item)

        cursor = chat_history_item.reply_to_message_id

        if (chat_history_item.reply_to_chat_id) {
          cursor_chat_id = chat_history_item.reply_to_chat_id
        }

        if (chat_history_item.system_chat_id) {
          system_chat_id = chat_history_item.system_chat_id
        }

        if (chat_history_item.system_message_id) {
          system_message_id = chat_history_item.system_message_id
        }
      } catch {
        break
      }
    }

    if (history.length === 0 && !system_content) {
      if (verbose) {
        ctx.telegram.editMessageText(
          chat_id,
          reply_result.message_id,
          undefined,
          '<i>failed to get any chat history or system prompt, stopped.</i>',
          {
            parse_mode: 'HTML',
          },
        )
      }
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
    if (!verbose) {
      ctx.replyWithChatAction('typing')
    }
  }, 1000)

  const messages = history
    .map((item) => [
      {
        role: 'user', content: item.image_url ? [
          { type: 'text', text: item.input },
          { type: 'image_url', image_url: item.image_url }
        ] : item.input
      },
      {
        role: 'assistant',
        content: item.output,
      },
    ])
    .flat(Infinity)

  const system_messages: typeof messages = []

  if (system_content) {
    system_messages.unshift({
      role: 'system',
      content: system_content,
    })
  } else if (system_chat_id && system_message_id) {
    const system_item_text = await client.get(
      `ntzyz-bot::chat-gpt::message_v2::${system_chat_id}::${system_message_id}`,
    )
    const system_item = (await JSON.parse(system_item_text)) as ChatGPT.ChatHistoryItem
    system_messages.unshift({
      role: 'system',
      content: system_item.system,
    })
  }

  messages.push({
    role: 'user',
    content: message_image_url ? [
      { type: 'text', text: message },
      { type: 'image_url', image_url: message_image_url }
    ] : message,
  })

  if (verbose) {
    ctx.telegram.editMessageText(
      chat_id,
      reply_result.message_id,
      undefined,
      `<i>waiting API response...</i>\n` +
        `<i>model: ${model}, history token: ${total_token}, message count: system=${system_messages.length}, user=${history.length}</i>`,
      {
        parse_mode: 'HTML',
      },
    )
  }

  for (let retry = 0; ; ) {
    const response = await fetch('https://api-openai.reverse-proxy.074ec6f331c7.uk/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openai_api_token}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [...system_messages, ...messages],
        temperature,
      }),
    })

    const data = (await response.json()) as any

    if (data.error?.code === 'context_length_exceeded' || data?.choices?.[0]?.finish_reason === 'length') {
      let unused_history = history.shift()
      total_token -= unused_history.token
      messages.splice(0, 2)
      if (verbose) {
        ctx.telegram.editMessageText(
          chat_id,
          reply_result.message_id,
          undefined,
          `<i>token limit exceeded, cutting history to ${total_token} tokens, retrying ...</i>`,
          {
            parse_mode: 'HTML',
          },
        )
      }
      continue
    }

    if (data.error) {
      console.log('ERROR from OpenAI API: ', JSON.stringify(data, null, 2))
      if (verbose) {
        await ctx.telegram.editMessageText(
          chat_id,
          reply_result.message_id,
          undefined,
          `<i>error occurred: ${data?.error?.message}, retrying (${retry + 1}/3)...</i>`,
          {
            parse_mode: 'HTML',
          },
        )
      }
    }

    chat_gpt_reply = data?.choices?.[0]?.message?.content

    if (chat_gpt_reply) {
      token_used = data?.usage?.total_tokens
      break
    }

    if (retry >= 3) {
      if (verbose) {
        await ctx.telegram.editMessageText(
          chat_id,
          reply_result.message_id,
          undefined,
          `<i>No valid response after 3 retries, stop.</i>`,
          {
            parse_mode: 'HTML',
          },
        )
      } else {
        chat_gpt_reply = ''
        await ctx.reply(`<i>No valid response after 3 retries, stop.</i>`, {
          reply_to_message_id: ctx.message.message_id,
          parse_mode: 'HTML',
        })
      }
      return
    }

    retry++
  }

  if (verbose) {
    try {
      await ctx.telegram.editMessageText(chat_id, reply_result.message_id, undefined, chat_gpt_reply, {
        parse_mode: 'Markdown',
      })
    } catch {
      await ctx.telegram.editMessageText(chat_id, reply_result.message_id, undefined, chat_gpt_reply)
    }
  } else {
    try {
      reply_result = await ctx.reply(chat_gpt_reply, {
        reply_to_message_id: ctx.message.message_id,
        parse_mode: 'Markdown',
      })
    } catch {
      reply_result = await ctx.reply(chat_gpt_reply, {
        reply_to_message_id: ctx.message.message_id,
      })
    }
  }

  await client.set(
    `ntzyz-bot::chat-gpt::message_v2::${chat_id}::${reply_result.message_id}`,
    JSON.stringify({
      reply_to_message_id: ctx.message.reply_to_message?.message_id,
      input: message,
      output: chat_gpt_reply,
      token: token_used - total_token,
      image_url: message_image_url,
      ...(system_chat_id && system_message_id
        ? {
            system_chat_id,
            system_message_id,
          }
        : {}),
    }),
  )
}

export default handler
