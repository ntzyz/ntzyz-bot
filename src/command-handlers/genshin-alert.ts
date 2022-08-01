import fetch from 'node-fetch'
import {
  GENSHIN_POLLING_TELEGRAM_UID_KEY,
  GENSHIN_POLLING_USER_IS_ALERTING_PREFIX,
  GENSHIN_POLLING_USER_LAST_FETCHED_AT_PREFIX,
  GENSHIN_POLLING_USER_LAST_RESULT_PREFIX,
} from '../cronjob/genshin-resin-alert'
import { digest_mihoyo_ds, extract_parameters, get_redis_client, query_genshin_info } from '../utils'

const handler: CommandHandler = async (ctx) => {
  const parameters = extract_parameters(ctx.message.text)
  const redis = get_redis_client()
  const uid_list = ((await redis.get(GENSHIN_POLLING_TELEGRAM_UID_KEY)) || '')
    .split(',')
    .map(Number)
    .filter((uid) => !!uid)
  const user_info = query_genshin_info(ctx.from.id)

  switch (parameters[0]) {
    case 'enable':
      {
        if (!user_info) {
          ctx.reply('Error: missing essential info (HoyoLab Cookie, etc).', {
            reply_to_message_id: ctx.message.message_id,
          })
          return
        }
        if (uid_list.includes(ctx.from.id)) {
          ctx.reply('你已经在车上了', { reply_to_message_id: ctx.message.message_id })
          return
        }
        uid_list.push(ctx.from.id)
        await redis.set(GENSHIN_POLLING_TELEGRAM_UID_KEY, uid_list.join(','))
        ctx.reply(`加入成功（UID：${user_info.uid}）`, { reply_to_message_id: ctx.message.message_id })
      }
      break
    case 'disable':
      {
        if (uid_list.includes(ctx.from.id)) {
          await redis.set(GENSHIN_POLLING_TELEGRAM_UID_KEY, uid_list.filter((id) => id !== ctx.from.id).join(','))
          ctx.reply(`退订成功`, { reply_to_message_id: ctx.message.message_id })
          return
        }
        ctx.reply('没事别玩 bot 谢谢', { reply_to_message_id: ctx.message.message_id })
      }
      break
    case 'status':
    case 'flush':
      {
        if (uid_list.includes(ctx.from.id)) {
          const now = Date.now()
          let last_fetched_at = Number(
            (await redis.get(`${GENSHIN_POLLING_USER_LAST_FETCHED_AT_PREFIX}::${ctx.from.id}`)) || '0',
          )
          const last_fetched_json = await redis.get(`${GENSHIN_POLLING_USER_LAST_RESULT_PREFIX}::${ctx.from.id}`)
          const is_alerting = JSON.parse(
            (await redis.get(`${GENSHIN_POLLING_USER_IS_ALERTING_PREFIX}::${ctx.from.id}`)) || '{}',
          ) as Partial<Record<'home_coin' | 'resin' | 'transformer', boolean>>

          let last_fetched_result: GenshinImpact.GenshinResinResponse['data'] = null

          if (parameters[0] === 'flush') {
            try {
              last_fetched_at = now
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

              last_fetched_result = data.data
              await redis.set(
                `${GENSHIN_POLLING_USER_LAST_RESULT_PREFIX}::${ctx.from.id}`,
                JSON.stringify(last_fetched_result),
              )
              await redis.set(`${GENSHIN_POLLING_USER_LAST_FETCHED_AT_PREFIX}::${ctx.from.id}`, last_fetched_at)
            } catch (ex) {
              console.error(ex)
              ctx.reply('什么东西出了错<del>，一定是米哈游干的</del>', {
                reply_to_message_id: ctx.message.message_id,
                parse_mode: 'HTML',
              })
              break
            }
          } else {
            try {
              last_fetched_result = JSON.parse(last_fetched_json)
              if (!last_fetched_result) {
                throw new Error('last_fetched_result is null')
              }
            } catch (e) {
              ctx.reply('尚未刷新，请等待至多四分钟后重试。', { reply_to_message_id: ctx.message.message_id })
              break
            }
          }

          const duration_by_minutes = (now - last_fetched_at) / (1000 * 60)
          const { recovery_time } = last_fetched_result.transformer
          const transformer_remaining_minutes =
            (recovery_time.Day * 24 + recovery_time.Hour) * 60 + recovery_time.Minute - duration_by_minutes

          const messageLines = []

          if (parameters[0] === 'status') {
            messageLines.push(`最近刷新时间：${new Date(last_fetched_at).toLocaleString('zh', { hour12: false })}`, '')

            messageLines.push(
              `当前状态：`,
              `• 原萃树脂：${(Number(last_fetched_result.resin_recovery_time) / 60 - duration_by_minutes).toFixed(
                1,
              )} 分钟（约为 ${last_fetched_result.current_resin + Math.floor(duration_by_minutes / 8)}，${is_alerting.resin ? '已报警' : '未报警'
              }）`,
              `• 洞天宝钱：${(Number(last_fetched_result.home_coin_recovery_time) / 60 - duration_by_minutes).toFixed(
                1,
              )} 分钟（${is_alerting.home_coin ? '已报警' : '未报警'}）`,
              `• 参量质变仪：${last_fetched_result.transformer.recovery_time.reached
                ? `冷却完成（${is_alerting.transformer ? '已报警' : '未报警'}）`
                : `冷却中（剩余约 ${transformer_remaining_minutes.toFixed(1)} 分钟）`
              }`,
              '',
            )
          } else {
            messageLines.push('刷新成功', '')

            messageLines.push(
              `当前状态：`,
              `• 原萃树脂：${(Number(last_fetched_result.resin_recovery_time) / 60 - duration_by_minutes).toFixed(
                1,
              )} 分钟（约为 ${last_fetched_result.current_resin + Math.floor(duration_by_minutes / 8)}）`,
              `• 洞天宝钱：${(Number(last_fetched_result.home_coin_recovery_time) / 60 - duration_by_minutes).toFixed(
                1,
              )} 分钟`,
              `• 参量质变仪：${last_fetched_result.transformer.recovery_time.reached
                ? '冷却完成'
                : `冷却中（剩余约 ${transformer_remaining_minutes.toFixed(1)} 分钟）`
              }`,
              '',
            )
          }

          if (parameters[0] === 'status') {
            messageLines.push('附加信息（非实时）：')
          } else {
            messageLines.push('附加信息：')
          }

          messageLines.push(
            `• 完成日常：${last_fetched_result.finished_task_num}/${last_fetched_result.total_task_num}，${last_fetched_result.is_extra_task_reward_received ? '已' : '未'
            }领工资`,
            `• 周常折扣：${last_fetched_result.remain_resin_discount_num}/${last_fetched_result.resin_discount_num_limit}`,
            `• 探索：${last_fetched_result.current_expedition_num}（${last_fetched_result.expeditions.filter((el) => el.status === 'Ongoing').length
            } 个进行中）`,
            '',
          )

          if (parameters[0] === 'status') {
            messageLines.push(
              '备注：本次查询未请求 MiHuYo 服务器，但是如果状态在报警中，本服务仍然会每小时轮训一次以确保数据最新。',
            )
          } else {
            messageLines.push('备注：刷新完成不会立刻进行报警，如果数据进入报警区间，机器人重复报警为正常行为。')
          }

          ctx.reply(messageLines.join('\n'), { reply_to_message_id: ctx.message.message_id })
        } else {
          ctx.reply('没有开启报警或没有米游社 Cookie！', { reply_to_message_id: ctx.message.message_id })
        }
      }
      break
    default:
      ctx.reply('Usage: /alert (enable|disable|status|flush)', {
        reply_to_message_id: ctx.message.message_id,
        disable_web_page_preview: true,
      })
  }
}

export default handler
