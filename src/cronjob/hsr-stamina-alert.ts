import { Telegraf } from 'telegraf'
import fetch from 'node-fetch'
import { get_redis_client, query_hsr_info, get_hsr_resin } from '../utils'
import { mihoyo_alert_notification_chat_id, mihoyo_stat_influxdb_host } from '../config'

export const HSR_POLLING_TELEGRAM_UID_KEY = 'ntzyz-bot::cronjob::hsr_stamina::telegram_uid_list'
export const HSR_POLLING_USER_LAST_FETCHED_AT_PREFIX = 'ntzyz-bot::cronjob::hsr_stamina::last_fetched_at_v2'
export const HSR_POLLING_USER_LAST_RESULT_PREFIX = 'ntzyz-bot::cronjob::hsr_stamina::last_resin_result_v2'
export const HSR_POLLING_USER_IS_ALERTING_PREFIX = 'ntzyz-bot::cronjob::hsr_stamina::is_alerting_v2'
export const HSR_POLLING_USER_IS_PAUSED = 'ntzyz-bot::cronjob::hsr_stamina::is_paused'
export const HSR_POLLING_ALERT_CHAT_ID = 'ntzyz-bot::cronjob::hsr_stamina::alert_chat_id'

// every four hours
const polling_cold_down = 1000 * 60 * 60 * 4
const alert_duration_before_reach = 120

export async function hsr_stamina_alert_interval(bot: Telegraf) {
  const redis = get_redis_client()
  const uid_list = ((await redis.get(HSR_POLLING_TELEGRAM_UID_KEY)) || '')
    .split(',')
    .map(Number)
    .filter((uid) => !!uid)

  if (uid_list.length === 0) {
    return
  }

  for (const uid of uid_list) {
    let last_fetched_at = Number((await redis.get(`${HSR_POLLING_USER_LAST_FETCHED_AT_PREFIX}::${uid}`)) || '0')
    let last_fetched_json = await redis.get(`${HSR_POLLING_USER_LAST_RESULT_PREFIX}::${uid}`)
    let is_alerting = JSON.parse(
      (await redis.get(`${HSR_POLLING_USER_IS_ALERTING_PREFIX}::${uid}`)) || '{}',
    ) as Partial<Record<'stamina', boolean>>
    let last_fetched_result: HSR.HSRStaminaResponse['data'] = null
    const user_info = query_hsr_info(uid)
    const alert_chat_id = Number(
      (await redis.get(`${HSR_POLLING_ALERT_CHAT_ID}::${uid}`)) || mihoyo_alert_notification_chat_id,
    )

    try {
      last_fetched_result = JSON.parse(last_fetched_json) as HSR.HSRStaminaResponse['data']
    } catch (ex) {
      console.log(ex)
      last_fetched_result = null
    }

    const now = Date.now()
    let duration_by_minutes = (now - last_fetched_at) / (1000 * 60)

    if (last_fetched_result) {
      try {
        await fetch(`${mihoyo_stat_influxdb_host}/write?db=hsr`, {
          method: 'POST',
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          body: [
            `estimated_stamina_recover_time,uid=${user_info.uid} value=${Math.max(
              0,
              last_fetched_result?.stamina_recover_time - (now - last_fetched_at) / 1000,
            )}`,
          ].join('\n'),
        })
      } catch (ex) {
        console.error('Failed to write latest result to influxdb: ', ex)
      }

      if (last_fetched_result?.stamina_recover_time / 60 - duration_by_minutes > alert_duration_before_reach) {
        await redis.set(`${HSR_POLLING_USER_IS_ALERTING_PREFIX}::${uid}`, '{}')
        continue
      }
    }

    if (last_fetched_at + polling_cold_down <= now || !last_fetched_result) {
      try {
        last_fetched_at = now
        last_fetched_result = await get_hsr_resin(user_info, bot)
        duration_by_minutes = 0

        await redis.set(`${HSR_POLLING_USER_LAST_FETCHED_AT_PREFIX}::${uid}`, last_fetched_at)
        await redis.set(`${HSR_POLLING_USER_LAST_RESULT_PREFIX}::${uid}`, JSON.stringify(last_fetched_result))

        if (last_fetched_result?.stamina_recover_time / 60 - duration_by_minutes > alert_duration_before_reach) {
          await redis.set(`${HSR_POLLING_USER_IS_ALERTING_PREFIX}::${uid}`, '{}')
          continue
        }
      } catch (ex) {
        console.error(ex)
        continue
      }
    }

    let telegramUserInfo: Awaited<ReturnType<typeof bot.telegram.getChatMember>>
    try {
      telegramUserInfo = await bot.telegram.getChatMember(alert_chat_id, uid)
    } catch {
      continue
    }

    if (last_fetched_result?.stamina_recover_time / 60 - duration_by_minutes <= alert_duration_before_reach) {
      if (!is_alerting.stamina) {
        is_alerting.stamina = true
        bot.telegram.sendMessage(
          alert_chat_id,
          `<a href="tg://user?id=${uid}">@${
            telegramUserInfo.user.username || telegramUserInfo.user.first_name
          }</a> 距离体力恢复还有约 ${(
            (last_fetched_result?.stamina_recover_time ?? 0) / 60 -
            duration_by_minutes
          ).toFixed(2)} 分钟，可以上线干活了`,
          {
            parse_mode: 'HTML',
          },
        )
      }
    } else {
      is_alerting.stamina = false
    }

    await redis.set(`${HSR_POLLING_USER_IS_ALERTING_PREFIX}::${uid}`, JSON.stringify(is_alerting))
  }
}
