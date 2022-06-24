import fetch from 'node-fetch'
import { extract_parameters } from '../utils'

const handler: CommandHandler = async (ctx) => {
  const parameters = extract_parameters(ctx.message.text)
  const text = parameters.join(' ')

  try {
    const response = await fetch('https://lab.magiconch.com/api/nbnhhsh/guess', {
      method: 'post',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        text,
      }),
    })

    const json = (await response.json()) as Array<{ trans?: Array<string>; inputting?: Array<string> }>

    ctx.reply([...(json[0].trans || []), ...(json[0].inputting || [])].join('，'), {
      reply_to_message_id: ctx.message.message_id,
      disable_web_page_preview: true,
      parse_mode: 'Markdown',
    })
  } catch (ex) {
    console.error(ex)
    ctx.reply('Error: Something happened.', {
      reply_to_message_id: ctx.message.message_id,
      disable_web_page_preview: true,
      parse_mode: 'Markdown',
    })
  }
}

export default handler
