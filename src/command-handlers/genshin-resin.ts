import fetch from 'node-fetch'
import { digest_mihoyo_ds, query_genshin_info } from '../utils'

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
    const response = await fetch(
      `https://api-takumi-mihoyo.reverse-proxy.074ec6f331c7.uk/game_record/app/genshin/api/dailyNote?role_id=${user_info.uid}&server=cn_gf01`,
      {
        headers: {
          Cookie: user_info.cookie,
          DS: digest_mihoyo_ds(user_info.uid),
          'x-rpc-app_version': '2.16.1',
          'x-rpc-client_type': '5',
        },
      },
    )
    const data = (await response.json()) as GenshinImpact.GenshinResinResponse

    if (data.retcode != 0) {
      ctx.reply('MiHuYo API Error: ' + data.message, { reply_to_message_id: ctx.message.message_id })
      return
    }

    ctx.reply(
      [
        `原粹树脂：${data.data.current_resin}/${data.data.max_resin}` +
        (data.data.current_resin !== data.data.max_resin
          ? `（${seconds_to_human_readable(Number(data.data.resin_recovery_time))}）`
          : ''),
        `完成日常：${data.data.finished_task_num}/${data.data.total_task_num}，${data.data.is_extra_task_reward_received ? '已' : '未'
        }领工资`,
        `洞天宝钱：${data.data.current_home_coin}/${data.data.max_home_coin}` +
        (data.data.current_resin !== data.data.max_resin
          ? `（${seconds_to_human_readable(Number(data.data.home_coin_recovery_time))}）`
          : ''),
        `周常折扣：${data.data.remain_resin_discount_num}/${data.data.resin_discount_num_limit}`,
        `探索：${data.data.current_expedition_num}（${data.data.expeditions.filter((el) => el.status === 'Ongoing').length
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
