import { get_genshin_resin, query_genshin_info } from '../utils'

function seconds_to_human_readable(duration: number) {
  const hours = Math.floor(duration / 3600)
  const minutes = Math.floor(duration / 60) % 60
  const seconds = duration % 60

  let result = ''

  if (hours > 0) {
    result += `${hours} 小时`
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
  const user_info = query_genshin_info(ctx.from.id)

  if (!user_info) {
    ctx.reply('Error: missing essential info.', { reply_to_message_id: ctx.message.message_id })
    return
  }

  try {
    const data = await get_genshin_resin(user_info, ctx.telegram as any)

    ctx.reply(
      [
        `原粹树脂：${data.current_resin}/${data.max_resin}` +
          (data.current_resin !== data.max_resin
            ? `（${seconds_to_human_readable(Number(data.resin_recovery_time))}）`
            : ''),
        `完成日常：${data.finished_task_num}/${data.total_task_num}，${
          data.is_extra_task_reward_received ? '已' : '未'
        }领工资`,
        `洞天宝钱：${data.current_home_coin}/${data.max_home_coin}` +
          (data.current_resin !== data.max_resin
            ? `（${seconds_to_human_readable(Number(data.home_coin_recovery_time))}）`
            : ''),
        `周常折扣：${data.remain_resin_discount_num}/${data.resin_discount_num_limit}`,
        `探索：${data.current_expedition_num}（${
          data.expeditions.filter((el) => el.status === 'Ongoing').length
        } 个进行中）`,
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
