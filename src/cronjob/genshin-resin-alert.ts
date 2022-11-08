import { Telegraf } from 'telegraf'
import fetch from 'node-fetch'
import {
  digest_mihoyo_ds,
  format_genshin_transformer_time,
  get_genshin_resin,
  get_redis_client,
  query_genshin_info,
} from '../utils'
import { genshin_alert_notification_chat_id, genshin_stat_influxdb_host } from '../config'

export const GENSHIN_POLLING_TELEGRAM_UID_KEY = 'ntzyz-bot::cronjob::genshin_resin::telegram_uid_list'
export const GENSHIN_POLLING_USER_LAST_FETCHED_AT_PREFIX = 'ntzyz-bot::cronjob::genshin_resin::last_fetched_at_v2'
export const GENSHIN_POLLING_USER_LAST_RESULT_PREFIX = 'ntzyz-bot::cronjob::genshin_resin::last_resin_result_v2'
export const GENSHIN_POLLING_USER_IS_ALERTING_PREFIX = 'ntzyz-bot::cronjob::genshin_resin::is_alerting_v2'

// hourly
const polling_cold_down = 1000 * 60 * 60 * 1
const alert_duration_before_reach = 90

function safe_string_to_number(numeric_string: string) {
  const parsed_result = Number(numeric_string)
  if (Number.isNaN(parsed_result)) {
    return 0
  }
  return parsed_result
}

export async function genshin_resin_alert_interval(bot: Telegraf) {
  const redis = get_redis_client()
  const uid_list = ((await redis.get(GENSHIN_POLLING_TELEGRAM_UID_KEY)) || '')
    .split(',')
    .map(Number)
    .filter((uid) => !!uid)

  if (uid_list.length === 0) {
    return
  }

  for (const uid of uid_list) {
    let last_fetched_at = Number((await redis.get(`${GENSHIN_POLLING_USER_LAST_FETCHED_AT_PREFIX}::${uid}`)) || '0')
    let last_fetched_json = await redis.get(`${GENSHIN_POLLING_USER_LAST_RESULT_PREFIX}::${uid}`)
    let is_alerting = JSON.parse(
      (await redis.get(`${GENSHIN_POLLING_USER_IS_ALERTING_PREFIX}::${uid}`)) || '{}',
    ) as Partial<Record<'home_coin' | 'resin' | 'transformer', boolean>>
    let last_fetched_result: GenshinImpact.GenshinResinResponse['data'] = null
    const user_info = query_genshin_info(uid)

    try {
      last_fetched_result = JSON.parse(last_fetched_json) as GenshinImpact.GenshinResinResponse['data']
    } catch (ex) {
      console.log(ex)
      last_fetched_result = null
    }

    const now = Date.now()
    let duration_by_minutes = (now - last_fetched_at) / (1000 * 60)

    if (last_fetched_result) {
      try {
        await fetch(`${genshin_stat_influxdb_host}/write?db=genshin`, {
          method: 'POST',
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
          body: [
            `estimated_resin_recovery_time,uid=${user_info.uid} value=${Math.max(
              0,
              safe_string_to_number(last_fetched_result.resin_recovery_time) - (now - last_fetched_at) / 1000,
            )}`,
            `estimated_coin_recovery_time,uid=${user_info.uid} value=${Math.max(
              0,
              safe_string_to_number(last_fetched_result.home_coin_recovery_time) - (now - last_fetched_at) / 1000,
            )}`,
            `estimated_transformer_recovery_time,uid=${user_info.uid} value=${Math.max(
              0,
              format_genshin_transformer_time(last_fetched_result.transformer.recovery_time) -
                (now - last_fetched_at) / 1000,
            )}`,
          ].join('\n'),
        })
      } catch (ex) {
        console.error('Failed to write latest result to influxdb: ', ex)
      }

      if (
        safe_string_to_number(last_fetched_result.resin_recovery_time) / 60 - duration_by_minutes >
          alert_duration_before_reach &&
        safe_string_to_number(last_fetched_result.home_coin_recovery_time) / 60 - duration_by_minutes >
          alert_duration_before_reach &&
        !last_fetched_result.transformer.recovery_time.reached
      ) {
        await redis.set(`${GENSHIN_POLLING_USER_IS_ALERTING_PREFIX}::${uid}`, '{}')
        continue
      }
    }

    if (last_fetched_at + polling_cold_down <= now || !last_fetched_result) {
      try {
        last_fetched_at = now
        last_fetched_result = await get_genshin_resin(user_info)
        duration_by_minutes = 0

        await redis.set(`${GENSHIN_POLLING_USER_LAST_FETCHED_AT_PREFIX}::${uid}`, last_fetched_at)
        await redis.set(`${GENSHIN_POLLING_USER_LAST_RESULT_PREFIX}::${uid}`, JSON.stringify(last_fetched_result))

        if (
          safe_string_to_number(last_fetched_result.resin_recovery_time) / 60 - duration_by_minutes >
            alert_duration_before_reach &&
          safe_string_to_number(last_fetched_result.home_coin_recovery_time) / 60 - duration_by_minutes >
            alert_duration_before_reach &&
          format_genshin_transformer_time(last_fetched_result.transformer.recovery_time) / 60 - duration_by_minutes >
            alert_duration_before_reach
        ) {
          await redis.set(`${GENSHIN_POLLING_USER_IS_ALERTING_PREFIX}::${uid}`, '{}')
          continue
        }
      } catch (ex) {
        console.error(ex)
        continue
      }
    }

    let telegramUserInfo: Awaited<ReturnType<typeof bot.telegram.getChatMember>>
    try {
      telegramUserInfo = await bot.telegram.getChatMember(genshin_alert_notification_chat_id, uid)
    } catch {
      continue
    }

    // 体力
    if (
      safe_string_to_number(last_fetched_result.resin_recovery_time) / 60 - duration_by_minutes <=
      alert_duration_before_reach
    ) {
      if (!is_alerting.resin) {
        is_alerting.resin = true
        bot.telegram.sendMessage(
          genshin_alert_notification_chat_id,
          `<a href="tg://user?id=${uid}">@${
            telegramUserInfo.user.username || telegramUserInfo.user.first_name
          }</a> 距离体力恢复还有约 ${(
            safe_string_to_number(last_fetched_result.resin_recovery_time) / 60 -
            duration_by_minutes
          ).toFixed(2)} 分钟，可以上线干活了`,
          {
            parse_mode: 'HTML',
          },
        )
      }
    } else {
      is_alerting.resin = false
    }

    // 洞天宝钱
    if (
      safe_string_to_number(last_fetched_result.home_coin_recovery_time) / 60 - duration_by_minutes <=
      alert_duration_before_reach
    ) {
      if (!is_alerting.home_coin) {
        is_alerting.home_coin = true
        bot.telegram.sendMessage(
          genshin_alert_notification_chat_id,
          `<a href="tg://user?id=${uid}">@${
            telegramUserInfo.user.username || telegramUserInfo.user.first_name
          }</a> 距离洞天宝钱溢出恢复还有约 ${(
            safe_string_to_number(last_fetched_result.home_coin_recovery_time) / 60 -
            duration_by_minutes
          ).toFixed(1)} 分钟，可以上线挥霍了`,
          {
            parse_mode: 'HTML',
          },
        )
      }
    } else {
      is_alerting.home_coin = false
    }

    // 垃圾桶
    if (
      format_genshin_transformer_time(last_fetched_result.transformer.recovery_time) / 60 - duration_by_minutes <=
      alert_duration_before_reach
    ) {
      if (!is_alerting.transformer) {
        is_alerting.transformer = true
        bot.telegram.sendMessage(
          genshin_alert_notification_chat_id,
          `<a href="tg://user?id=${uid}">@${
            telegramUserInfo.user.username || telegramUserInfo.user.first_name
          }</a> 参量质变仪冷却完了，可以上线倒垃圾了`,
          {
            parse_mode: 'HTML',
          },
        )
      }
    } else {
      is_alerting.transformer = false
    }

    await redis.set(`${GENSHIN_POLLING_USER_IS_ALERTING_PREFIX}::${uid}`, JSON.stringify(is_alerting))
  }
}
