import {
  get_genshin_resin,
  get_hsr_resin,
  query_genshin_info,
  query_hsr_info,
  seconds_to_human_readable,
} from '../utils'

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
