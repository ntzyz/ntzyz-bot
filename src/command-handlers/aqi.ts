import fetch from 'node-fetch'
import { aqi_token } from '../config'

const handler: CommandHandler = async (ctx) => {
  const response = await fetch(`https://api.waqi.info/feed/shanghai/?token=${aqi_token}`, {
    headers: {
      ['user-agent']: 'curl/7.54.0',
    },
  })

  const json = (await response.json()) as AQI.AQIResponse

  ctx.reply(
    [
      `城市名称：[${json.data.city.name}](${json.data.city.url})`,
      `数据时间：${json.data.time.s}`,
      `空气质量指数：${json.data.aqi}`,
    ].join('\n'),
    {
      reply_to_message_id: ctx.message.message_id,
      disable_web_page_preview: true,
      parse_mode: 'Markdown',
    },
  )
}

export default handler
