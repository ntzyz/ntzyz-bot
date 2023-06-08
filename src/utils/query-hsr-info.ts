import { bot_owner, hsr_user_info } from '../config'

export function query_hsr_info(user_id: number | string) {
  if (hsr_user_info[user_id]) {
    return hsr_user_info[user_id]
  }
  return null
}
