import { Message } from "telegraf/typings/core/types/typegram"
import { Telegraf } from "telegraf"
import fetch from 'node-fetch'
import { FormData } from "formdata-node"
import { get_whitelist } from "../command-handlers/chat"
import { extname } from 'node:path'
import { writeFile } from 'node:fs/promises'
import { bot_owner, openai_api_token, chat_export_pages_origin, chat_snapshot_key } from "../config"
import { v4 as UUID } from 'uuid'

export default (async (ctx) => {
  const whitelist = await get_whitelist()
  const chat_id = ctx.message.chat.id

  if (!whitelist.includes(chat_id)) {
    ctx.reply('You shall not access', {
      reply_to_message_id: ctx.message.message_id,
      parse_mode: 'MarkdownV2',
    })
    return
  }

  let link: string
  let response_mode = 'text'

  if ('voice' in ctx.message) {
    link = (await ctx.telegram.getFileLink((ctx.message as Message.VoiceMessage).voice.file_id)).toString()
  } else if ('audio' in ctx.message) {
    link = (await ctx.telegram.getFileLink((ctx.message as Message.AudioMessage).audio.file_id)).toString()
    response_mode = 'srt'
  }

  const voiceBufferResponse = await fetch(link)
  const voiceBuffer = await voiceBufferResponse.blob()

  const fd = new FormData()
  fd.append('file', voiceBuffer, `voice${extname(link)}`)
  fd.append('model', 'whisper-1')
  fd.append('response_format', response_mode)
  fd.append('language', 'zh')

  const apiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openai_api_token}`
    },
    body: fd as any
  })
  const text = await apiResponse.text();

  if (response_mode === 'srt') {
    const filename = `/tmp/${UUID()}.srt`

    await writeFile(filename, text)

    ctx.telegram.sendDocument(ctx.from.id, {
      source: Buffer.from(text),
      filename: 'result.srt'
    }, {
      reply_to_message_id: ctx.message.message_id,
    })
  } else {
    ctx.reply(text, {
      reply_to_message_id: ctx.message.message_id,
    })
  }
}) as Parameters<Telegraf['on']>[1]
