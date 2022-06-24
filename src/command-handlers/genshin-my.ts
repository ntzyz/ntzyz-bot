import { GenshinKit } from '@genshin-kit/core'
import { extract_parameters, get_genshin_character_name, query_genshin_info } from '../utils'

const handler: CommandHandler = async (ctx) => {
  const parameters = extract_parameters(ctx.message.text)

  let character = null
  let user_id = ctx.from.id

  for (const parameter of parameters) {
    if (/^runas=(\d+)$/.test(parameter)) {
      user_id = Number(parameter.substring(6))
    } else {
      character = parameter
    }
  }

  if (!parameters[0]) {
    ctx.reply('Usage: /my [runas=telegram user id] 旅行者', { reply_to_message_id: ctx.message.message_id })
    return
  }

  const user_info = query_genshin_info(user_id)

  if (!user_info) {
    ctx.reply('Error: missing essential info.', { reply_to_message_id: ctx.message.message_id })
    return
  }

  const kit = new GenshinKit()
  kit.loginWithCookie(user_info.cookie)

  try {
    const name = get_genshin_character_name(character)
    if (!name) {
      ctx.reply('Error: 未识别的名字，联系管理员补充吧!', {
        reply_to_message_id: ctx.message.message_id,
        disable_web_page_preview: true,
      })
      return
    }
    const characters = await kit.getCharacters(user_info.uid)
    const [matched_character] = characters.filter((el) => el.name === name)

    if (!matched_character) {
      ctx.reply(`Error: 角色列表里没找到「${name}」`, {
        reply_to_message_id: ctx.message.message_id,
        disable_web_page_preview: true,
      })
      return
    }

    ctx.reply(
      [
        `${matched_character.name} Lv. ${matched_character.level} C${matched_character.actived_constellation_num}`,
        `武器：${matched_character.weapon.name} R${matched_character.weapon.affix_level} Lv. ${matched_character.weapon.level}`,
        `圣遗物：` + matched_character.reliquaries.map((el) => el.name).join('，'),
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
