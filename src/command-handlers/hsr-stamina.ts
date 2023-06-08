import { get_genshin_resin, get_hsr_resin, query_genshin_info, query_hsr_info } from '../utils'

function seconds_to_human_readable(duration: number) {
  const hours = Math.floor(duration / 3600)
  const minutes = Math.floor(duration / 60) % 60
  const seconds = duration % 60

  let result = ''

  if (hours > 0) {
    result += `${hours} 时`
  }

  if (minutes > 0) {
    result += ` ${minutes} 分`
  }

  if (duration === 0) {
    result = null
  }

  return result
}

const handler: CommandHandler = async (ctx) => {
  const user_info = query_hsr_info(ctx.from.id)

  if (!user_info) {
    ctx.reply('Error: missing essential info.', { reply_to_message_id: ctx.message.message_id })
    return
  }

  try {
    const data = await get_hsr_resin(user_info, ctx.telegram as any)
    ctx.reply(
      [
        `当前体力：${data.current_stamina} / ${data.max_stamina}` +
          (data.max_stamina === data.current_stamina
            ? ''
            : `（${seconds_to_human_readable(Number(data.stamina_recover_time))}）`),
        `探索派遣：`,
        data.expeditions
          .map(
            (item) =>
              `- ${item.name}：${item.status}` +
              (item.remaining_time === 0 ? '' : `（${seconds_to_human_readable(Number(item.remaining_time))}）`),
          )
          .join('\n'),
      ].join('\n'),
      { parse_mode: 'HTML', reply_to_message_id: ctx.message.message_id },
    )
  } catch (ex) {
    console.error(ex)
    ctx.reply('什么东西出了错<del>，一定是米哈游干的</del>', {
      reply_to_message_id: ctx.message.message_id,
      parse_mode: 'HTML',
    })
  }
}

export default handler
