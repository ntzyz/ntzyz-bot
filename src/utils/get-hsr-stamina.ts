import fetch from 'node-fetch'
import { Telegraf } from 'telegraf'
import { digest_hoyolab_ds, digest_mihoyo_ds } from './digest-mihoyo-ds'
import { genshin_alert_notification_chat_id, genshin_stat_influxdb_host } from '../config'
import { format_genshin_transformer_time } from './format-genshin-transformer-time'
import { get_redis_client } from './get-redis-client'
import { GENSHIN_POLLING_USER_IS_PAUSED } from '../cronjob/genshin-resin-alert'

export async function get_hsr_resin(user_info: HSRUserInfo, bot: Telegraf) {
  // TODO: implementation
  // const redis = get_redis_client()
  // if ((await redis.get(`${GENSHIN_POLLING_USER_IS_PAUSED}::${user_info.uid}`)) === 'true') {
  //   throw new Error(`Service internally paused for user uid = ${user_info.uid}`)
  // }
  const response = await fetch(
    `https://bbs-api-os.hoyolab.com/game_record/hkrpg/api/note?server=${user_info.server}&role_id=${user_info.uid}`,
    {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
        'x-rpc-app_version': '1.5.0',
        'x-rpc-client_type': '5',
        'x-rpc-language': 'zh-cn',
        Cookie: user_info.cookie,
        DS: user_info.is_overseas ? digest_hoyolab_ds() : digest_mihoyo_ds(user_info.uid),
      },
    },
  )
  const data = (await response.json()) as HSR.HSRStaminaResponse

  if (data.retcode != 0) {
    console.error(data)

    throw new Error(
      `Failed to call miHoYo API for uid = ${user_info.uid}. Response is: ` + JSON.stringify(data, null, 2),
    )
  }

  try {
    await fetch(`${genshin_stat_influxdb_host}/write?db=hsr`, {
      method: 'POST',
      headers: {
        'content-type': 'text/plain; charset=utf-8',
      },
      body: `official_stamina_recover_time,uid=${user_info.uid} value=${data.data.stamina_recover_time}`,
    })
  } catch (ex) {
    console.error('Failed to write latest result to influxdb: ', ex)
  }

  return data.data
}
