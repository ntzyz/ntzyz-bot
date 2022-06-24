import { bot_owner, genshin_user_info } from '../config'

export function query_genshin_info(user_id: number | string) {
  if (genshin_user_info[user_id]) {
    return genshin_user_info[user_id]
  }
  return null
}
