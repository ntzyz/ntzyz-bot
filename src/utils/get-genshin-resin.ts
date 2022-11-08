import fetch from 'node-fetch'
import { digest_mihoyo_ds } from './digest-mihoyo-ds'
import { genshin_stat_influxdb_host } from '../config'
import { format_genshin_transformer_time } from './format-genshin-transformer-time'

export async function get_genshin_resin(user_info: GenshinUserInfo) {
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
    throw new Error('MiHuYo API Error: ' + data.message)
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
