import { GenshinKit } from '@genshin-kit/core'
import { get_genshin_element_name, query_genshin_info } from '../utils'

const handler: CommandHandler = async (ctx) => {
  const user_info = query_genshin_info(ctx.from.id)

  if (!user_info) {
    ctx.reply('Error: missing essential info.', { reply_to_message_id: ctx.message.message_id })
    return
  }

  const kit = new GenshinKit()
  kit.loginWithCookie(user_info.cookie)

  try {
    const full_user_info = await kit.getUserInfo(user_info.uid)

    ctx.reply(
      [
        ...full_user_info.avatars
          .filter((el) => el.level >= 21)
          .map((el) =>
            [
              `[${get_genshin_element_name(el.element)}] ${el.name.padEnd(5, '　')} (Lv. <code>${String(
                el.level,
              ).padStart(2)}</code>; C<code>${el.actived_constellation_num}</code>; ${Math.min(el.rarity, 5)}★)`,
            ].join('\n'),
          ),
        `备注：已省略 ${full_user_info.avatars.filter((el) => el.level < 21).length}个小于 21 级的角色`,
      ].join('\n'),
      {
        reply_to_message_id: ctx.message.message_id,
        disable_web_page_preview: true,
        parse_mode: 'HTML',
      },
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
