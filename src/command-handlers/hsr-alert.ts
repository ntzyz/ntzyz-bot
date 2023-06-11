import {
  HSR_POLLING_ALERT_CHAT_ID,
  HSR_POLLING_TELEGRAM_UID_KEY,
  HSR_POLLING_USER_IS_ALERTING_PREFIX,
  HSR_POLLING_USER_LAST_FETCHED_AT_PREFIX,
  HSR_POLLING_USER_LAST_RESULT_PREFIX,
} from '../cronjob/hsr-stamina-alert'
import {
  extract_parameters,
  get_redis_client,
  get_hsr_resin,
  query_hsr_info,
  seconds_to_human_readable,
} from '../utils'

const handler: CommandHandler = async (ctx) => {
  const parameters = extract_parameters(ctx.message.text)
  const redis = get_redis_client()
  const uid_list = ((await redis.get(HSR_POLLING_TELEGRAM_UID_KEY)) || '')
    .split(',')
    .map(Number)
    .filter((uid) => !!uid)
  const user_info = query_hsr_info(ctx.from.id)

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
        await redis.set(HSR_POLLING_TELEGRAM_UID_KEY, uid_list.join(','))
        await redis.set(HSR_POLLING_ALERT_CHAT_ID, ctx.chat.id)
        ctx.reply(`加入成功（UID：${user_info.uid}）`, { reply_to_message_id: ctx.message.message_id })
      }
      break
    case 'disable':
      {
        if (uid_list.includes(ctx.from.id)) {
          await redis.set(HSR_POLLING_TELEGRAM_UID_KEY, uid_list.filter((id) => id !== ctx.from.id).join(','))
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
            (await redis.get(`${HSR_POLLING_USER_LAST_FETCHED_AT_PREFIX}::${ctx.from.id}`)) || '0',
          )
          const last_fetched_json = await redis.get(`${HSR_POLLING_USER_LAST_RESULT_PREFIX}::${ctx.from.id}`)
          const is_alerting = JSON.parse(
            (await redis.get(`${HSR_POLLING_USER_IS_ALERTING_PREFIX}::${ctx.from.id}`)) || '{}',
          ) as Partial<Record<'stamina', boolean>>

          let last_fetched_result: HSR.HSRStaminaResponse['data'] = null

          if (parameters[0] === 'flush') {
            try {
              last_fetched_at = now
              last_fetched_result = await get_hsr_resin(user_info, ctx.telegram as any)

              await redis.set(
                `${HSR_POLLING_USER_LAST_RESULT_PREFIX}::${ctx.from.id}`,
                JSON.stringify(last_fetched_result),
              )
              await redis.set(`${HSR_POLLING_USER_LAST_FETCHED_AT_PREFIX}::${ctx.from.id}`, last_fetched_at)
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
          const messageLines = []

          if (parameters[0] === 'status') {
            messageLines.push(`最近刷新时间：${new Date(last_fetched_at).toLocaleString('zh', { hour12: false })}`, '')

            messageLines.push(
              `体力：${(Number(last_fetched_result.stamina_recover_time) / 60 - duration_by_minutes).toFixed(
                1,
              )} 分钟（约为 ${last_fetched_result.current_stamina + Math.floor(duration_by_minutes / 6)}，${
                is_alerting.stamina ? '已报警' : '未报警'
              }）`,
            )
          } else {
            messageLines.push('刷新成功', '')

            messageLines.push(
              `体力：${(Number(last_fetched_result.stamina_recover_time) / 60 - duration_by_minutes).toFixed(1)} 分钟`,
              '',
            )
          }

          if (parameters[0] === 'status') {
            messageLines.push('附加信息（非实时）：')
          } else {
            messageLines.push('附加信息：')
          }

          messageLines.push(
            `探索派遣：`,
            last_fetched_result.expeditions
              .map(
                (item) =>
                  `- ${item.name}：${item.status}` +
                  (item.remaining_time === 0 ? '' : `（${seconds_to_human_readable(Number(item.remaining_time))}）`),
              )
              .join('\n'),
            '',
          )

          if (parameters[0] === 'status') {
            messageLines.push(
              '备注：本次查询未请求 HoYoverse 服务器，但是如果状态在报警中，本服务仍然会每小时轮训一次以确保数据最新。',
            )
          } else {
            messageLines.push('备注：刷新完成不会立刻进行报警，如果数据进入报警区间，机器人重复报警为正常行为。')
          }

          ctx.reply(messageLines.join('\n'), { reply_to_message_id: ctx.message.message_id })
        } else {
          ctx.reply('没有开启报警或没有米游社/HoYoLab Cookie！', { reply_to_message_id: ctx.message.message_id })
        }
      }
      break
    default:
      ctx.reply('Usage: /hsr_alert (enable|disable|status|flush)', {
        reply_to_message_id: ctx.message.message_id,
        disable_web_page_preview: true,
      })
  }
}

export default handler
