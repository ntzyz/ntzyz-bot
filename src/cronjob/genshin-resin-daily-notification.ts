import { Telegraf } from 'telegraf'
import { genshin_alert_notification_chat_id } from '../config'
import { get_genshin_resin, get_redis_client, query_genshin_info } from '../utils'

export const GENSHIN_DAILY_NOTIFICATION_TELEGRAM_UID_KEY = 'ntzyz-bot::cronjob::genshin_daily::telegram_uid_list'
export const GENSHIN_DAILY_NOTIFICATION_TRIGGER_TIME = 'ntzyz-bot::cronjob::genshin_daily::trigger_time'
export const GENSHIN_DAILY_NOTIFICATION_LAST_SENT_AT = 'ntzyz-bot::cronjob::genshin_daily::last_sent_at'

async function send_notification(bot: Telegraf, telegram_uid: number) {
  let telegramUserInfo: Awaited<ReturnType<typeof bot.telegram.getChatMember>>
  try {
    telegramUserInfo = await bot.telegram.getChatMember(genshin_alert_notification_chat_id, telegram_uid)
  } catch {
    return
  }

  const user_info = query_genshin_info(telegram_uid)
  try {
    const data = await get_genshin_resin(user_info, bot)

    bot.telegram.sendMessage(
      genshin_alert_notification_chat_id,
      [
        `<a href="tg://user?id=${telegram_uid}">@${
          telegramUserInfo.user.username || telegramUserInfo.user.first_name
        }</a> 每日定时通知：`,
        `• 原粹树脂：${data.current_resin}/${data.max_resin}`,
        `• 完成日常：${data.finished_task_num}/${data.total_task_num}，${
          data.is_extra_task_reward_received ? '已' : '未'
        }领工资`,
        `• 洞天宝钱：${data.current_home_coin}/${data.max_home_coin}`,
        `• 周常折扣：${data.remain_resin_discount_num}/${data.resin_discount_num_limit}`,
        `• 探索：${data.current_expedition_num}（${
          data.expeditions.filter((el) => el.status === 'Ongoing').length
        } 个进行中）`,
        `请确认是否需要上线处理 _(:з」∠)_`,
      ].join('\n'),
      {
        parse_mode: 'HTML',
      },
    )
  } catch (ex) {
    bot.telegram.sendMessage(
      genshin_alert_notification_chat_id,
      [
        `<a href="tg://user?id=${telegram_uid}">@${
          telegramUserInfo.user.username || telegramUserInfo.user.first_name
        }</a> 每日定时通知获取失败，跳过本次日报。具体错误：\n`,
        `<code>${ex}</code>`,
      ].join('\n'),
      {
        parse_mode: 'HTML',
      },
    )
  }
}

export async function genshin_resin_daily_notification(bot: Telegraf) {
  const redis = get_redis_client()
  const telegram_uid_list = ((await redis.get(GENSHIN_DAILY_NOTIFICATION_TELEGRAM_UID_KEY)) || '')
    .split(',')
    .map(Number)
    .filter((uid) => !!uid)
  const today = `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`

  if (telegram_uid_list.length === 0) {
    return
  }

  for (const telegram_uid of telegram_uid_list) {
    const trigger_time = (await redis.get(`${GENSHIN_DAILY_NOTIFICATION_TRIGGER_TIME}::${telegram_uid}`)) || ''
    const last_sent_date = (await redis.get(`${GENSHIN_DAILY_NOTIFICATION_LAST_SENT_AT}::${telegram_uid}`)) || ''

    if (!trigger_time.match(/^\d{1,2}:\d{1,2}$/)) {
      continue
    }

    if (last_sent_date === today) {
      continue
    }

    const time_segments = trigger_time.split(':')
    const hour = Number(time_segments[0])
    const minute = Number(time_segments[1])
    const trigger_seconds_of_day = hour * 60 * 60 + minute * 60
    const current_seconds_of_day =
      new Date().getHours() * 60 * 60 + new Date().getMinutes() * 60 + new Date().getSeconds()

    console.log({ trigger_seconds_of_day, current_seconds_of_day })

    if (current_seconds_of_day > trigger_seconds_of_day) {
      try {
        await send_notification(bot, telegram_uid)
      } catch (ex) {
        console.error(ex)
        continue
      }

      await redis.set(`${GENSHIN_DAILY_NOTIFICATION_LAST_SENT_AT}::${telegram_uid}`, today)
    }
  }
}
