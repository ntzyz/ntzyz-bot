import fetch from 'node-fetch'
import { bot_owner, netease_cloud_music_cookie, nmid_white_list_chat_ids } from '../config'
import { extract_parameters } from '../utils'

const fetch_options = {
  headers: {
    cookie: netease_cloud_music_cookie,
    'x-real-ip': '114.88.129.217',
    'user-agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/603.2.4 (KHTML, like Gecko) Version/10.1.1 Safari/603.2.4',
    referer: 'https://music.163.com',
  },
}

function inject_basic_auth(options: typeof fetch_options) {
  const new_options = JSON.parse(JSON.stringify(fetch_options))

  Reflect.set(new_options.headers, 'authorization', 'Basic ' + btoa('ntzyz:Q1M8OxCz'))

  return new_options
}

const handler: CommandHandler = async (ctx) => {
  if (ctx.from.id !== bot_owner && !nmid_white_list_chat_ids.includes(ctx.chat.id)) {
    ctx.reply('Error: Permission denied.', {
      reply_to_message_id: ctx.message.message_id,
    })
    return
  }

  const parameters = extract_parameters(ctx.message.text)
  const text = parameters.join(' ')
  ctx.replyWithChatAction('record_voice')

  let id = null
  if (/^\d+$/.test(text)) {
    id = text
  } else {
    let r = text.match(/http:\/\/music\.163\.com\/song\/(\d+)\//iu)
    if (r) {
      id = r[1]
    } else {
      r = text.match(/\?id=(\d+)/iu)
      if (r) {
        id = r[1]
      }
    }
  }

  if (id === null) {
    ctx.reply('Error: Failed to match song id.', {
      reply_to_message_id: ctx.message.message_id,
    })
    return
  }

  try {
    const [song_url, song_info] = (await Promise.all(
      [
        fetch(`https://music.ntzyz.io/song/url?id=${id}&br=192000`, inject_basic_auth(fetch_options)),
        fetch(`https://music.ntzyz.io/song/detail?ids=${id}`, inject_basic_auth(fetch_options)),
      ].map((promise) => promise.then((response) => response.json())),
    )) as [NeteaseMusic.NeteaseMusicSongURLResponse, NeteaseMusic.NeteaseMusicSongDetailResponse]

    const real_url = song_url.data[0]?.url

    if (!real_url) {
      ctx.reply('Error: Failed to retrieve song URL.', {
        reply_to_message_id: ctx.message.message_id,
      })
      return
    }

    const music_response = await fetch(real_url, fetch_options)
    const music_arraybuffer = await music_response.arrayBuffer()

    ctx.replyWithAudio(
      {
        filename: `${id}.mp3`,
        source: Buffer.from(music_arraybuffer),
      },
      {
        caption: `${song_info.songs[0].name} by ${song_info.songs[0].ar.map((e) => e.name).join('/')}`,
        reply_to_message_id: ctx.message.message_id,
      },
    )
  } catch (ex) {
    console.error(ex)
    ctx.reply('Error: Something happened.', {
      reply_to_message_id: ctx.message.message_id,
    })
    return
  }
}

export default handler
