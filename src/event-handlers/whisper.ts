import { Message } from "telegraf/typings/core/types/typegram"
import { Telegraf } from "telegraf"
import fetch from 'node-fetch'
import { FormData } from "formdata-node"
import { get_whitelist } from "../command-handlers/chat"
import { bot_owner, openai_api_token } from "../config"

export default ['voice', async (ctx) => {
  const whitelist = await get_whitelist()
  const chat_id = ctx.message.chat.id

  if (!whitelist.includes(chat_id)) {
    ctx.reply('You shall not access', {
      reply_to_message_id: ctx.message.message_id,
      parse_mode: 'MarkdownV2',
    })
    return
  }

  const link = await ctx.telegram.getFileLink((ctx.message as Message.VoiceMessage).voice.file_id)

  const voiceBufferResponse = await fetch(link.toString())
  const voiceBuffer = await voiceBufferResponse.blob()

  const fd = new FormData()
  fd.append('file', voiceBuffer, 'voice.oga')
  fd.append('model', 'whisper-1')
  fd.append('response_format', 'text')
  fd.append('language', 'zh')

  const apiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openai_api_token}`
    },
    body: fd as any
  })
  const text = await apiResponse.text();

  ctx.reply(text, {
    reply_to_message_id: ctx.message.message_id,
  })
}] as Parameters<Telegraf['on']>
