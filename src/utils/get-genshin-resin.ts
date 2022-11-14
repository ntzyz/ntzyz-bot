import fetch from 'node-fetch'
import { Telegraf } from 'telegraf'
import { digest_mihoyo_ds } from './digest-mihoyo-ds'
import { genshin_alert_notification_chat_id, genshin_stat_influxdb_host } from '../config'
import { format_genshin_transformer_time } from './format-genshin-transformer-time'
import { get_redis_client } from './get-redis-client'
import { GENSHIN_POLLING_USER_IS_PAUSED } from '../cronjob/genshin-resin-alert'

export async function get_genshin_resin(user_info: GenshinUserInfo, bot: Telegraf) {
  const redis = get_redis_client()
  if ((await redis.get(`${GENSHIN_POLLING_USER_IS_PAUSED}::${user_info.uid}`)) === 'true') {
    throw new Error(`Service internally paused for user uid = ${user_info.uid}`)
  }

  const response = await fetch(
    `https://api-takumi-mihoyo.reverse-proxy.074ec6f331c7.uk/game_record/app/genshin/api/dailyNote?role_id=${user_info.uid}&server=cn_gf01`,
    {
      headers: {
        Cookie: user_info.cookie,
        DS: digest_mihoyo_ds(user_info.uid),
        'x-rpc-app_version': '2.37.1',
        'x-rpc-client_type': '5',
      },
    },
  )

  const data = (await response.json()) as GenshinImpact.GenshinResinResponse

  if (data.retcode === 1034) {
    await Promise.all([
      redis.setEx(`${GENSHIN_POLLING_USER_IS_PAUSED}::${user_info.uid}`, 86400, 'true'),
      bot.telegram.sendMessage(
        genshin_alert_notification_chat_id,
        [
          `米游社接口触发验证码（UID：${user_info.uid}），定时任务等所有需要获取便签数据的功能将暂停，解决办法：\n`,
          '1. 等待24小时后，机器人自动尝试重试；',
          '2. 打开米游社查看「我的角色」完成验证，并使用 /recover 命令取消暂停；',
        ].join('\n'),
        {
          parse_mode: 'HTML',
        },
      ),
      (async () => {
        try {
          await fetch(`${genshin_stat_influxdb_host}/write?db=genshin`, {
            method: 'POST',
            headers: {
              'content-type': 'text/plain; charset=utf-8',
            },
            body: [
              `official_resin_api_failure,uid=${user_info.uid} value=${data.data.resin_recovery_time}`,
              `official_coin_api_failure,uid=${user_info.uid} value=${data.data.home_coin_recovery_time}`,
              `official_transformer_api_failure,uid=${user_info.uid} value=${format_genshin_transformer_time(
                data.data.transformer.recovery_time,
              )}`,
            ].join('\n'),
          })
        } catch (ex) {
          console.error('Failed to write latest result to influxdb: ', ex)
        }
      })(),
    ])

    throw new Error(`Service internally paused for user uid = ${user_info.uid}`)
  } else if (data.retcode != 0) {
    console.error(data)

    throw new Error(
      `Failed to call miHoYo API for uid = ${user_info.uid}. Response is: ` + JSON.stringify(data, null, 2),
    )
  }

  try {
    await fetch(`${genshin_stat_influxdb_host}/write?db=genshin`, {
      method: 'POST',
      headers: {
        'content-type': 'text/plain; charset=utf-8',
      },
      body: [
        `official_resin_recovery_time,uid=${user_info.uid} value=${data.data.resin_recovery_time}`,
        `official_coin_recovery_time,uid=${user_info.uid} value=${data.data.home_coin_recovery_time}`,
        `official_transformer_recovery_time,uid=${user_info.uid} value=${format_genshin_transformer_time(
          data.data.transformer.recovery_time,
        )}`,
      ].join('\n'),
    })
  } catch (ex) {
    console.error('Failed to write latest result to influxdb: ', ex)
  }

  return data.data
}
