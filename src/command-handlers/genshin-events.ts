import fetch from 'node-fetch'

let sourceCache: string = null

export function clearTimelineCache() {
  sourceCache = null;
}

function formatEvent(event: PaimonMoe.GenshinEvent) {
  const formatDate = (str: string) => {
    const date = new Date(str)
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${(date.getDate()).toString().padStart(2, '0')}`
  }

  return `<a href="${event.url}">${event.name}</a> (${formatDate(event.start)} - ${formatDate(event.end)})`
}

const handler: CommandHandler = async (ctx) => {
  if (sourceCache === null) {
    const response = await fetch('https://raw.githubusercontent.com/MadeBaruna/paimon-moe/main/src/data/timeline.js')
    if (response.status >= 400) {
      ctx.reply('从 paimon.moe 中获取活动日历失败，检查日志或过段时间重试。', {
        reply_to_message_id: ctx.message.message_id,
        parse_mode: 'HTML',
      })
      return
    }
    const source = await response.text();
    const dataUrlSource = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`

    try {
      await import(dataUrlSource)
    } catch (ex) {
      console.log(ex)
      ctx.reply('解析活动日历失败，检查日志或过段时间重试。', {
        reply_to_message_id: ctx.message.message_id,
        parse_mode: 'HTML',
      })
      return
    }
    sourceCache = dataUrlSource
    setTimeout(clearTimelineCache, 1000 * 60 * 60 * 24)
  }

  const data = await import(sourceCache)
  const events = data.eventsData.flat(Infinity) as PaimonMoe.GenshinEvent[]
  const now = new Date()
  const undertakingEvents: PaimonMoe.GenshinEvent[] = []
  const upcomingEvents: PaimonMoe.GenshinEvent[] = []

  for (const event of events) {
    const begin = new Date(event.start)
    const end = new Date(event.end)
    if (begin.getTime() < now.getTime() && now.getTime() < end.getTime()) {
      undertakingEvents.push(event)
    }
    if (begin.getTime() > now.getTime()) {
      upcomingEvents.push(event)
    }
  }

  undertakingEvents.sort((a, b) => a.start.localeCompare(b.start))
  upcomingEvents.sort((a, b) => a.start.localeCompare(b.start)).slice(0, 5)

  ctx.reply([
    '<b># 正在进行的活动</b>\n',
    (undertakingEvents.map(formatEvent).join('\n')),
    '\n<b># 即将开始的活动</b>\n',
    (upcomingEvents.map(formatEvent).join('\n')),
  ].join('\n'), {
    reply_to_message_id: ctx.message.message_id,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  })
}

export default handler
