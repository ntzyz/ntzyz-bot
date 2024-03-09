export const webhook_prefix = 'https://example.com'
export const bot_token = process.env.NODE_ENV === 'production' ? '<redacted>' : '<redacted>'
export const http_server_port = 0
export const bot_owner = 0
export const pin_history_channel_id = 0
export const notification_chat_id = 0
export const notification_v1_token = 'redacted'
export const notification_v2_telegraf_token = 'redacted'
export const notification_v2_updown_token = 'redacted'
export const nmid_white_list_chat_ids = [0, 1]
export const redis_url = process.env.NODE_ENV === 'production' ? '<redacted>' : '<redacted>'
export const genshin_alert_notification_chat_id = process.env.NODE_ENV === 'production' ? 0 : bot_owner
export const aqi_token = 'redacted'
export const netease_cloud_music_cookie = 'redacted'
export const openai_api_token = 'redacted'
export const claude_api_token = 'redacted'
export const chat_whitelist = [bot_owner]
export const chat_snapshot_key = 'redacted'
export const chat_export_file_prefix = '/dev/shm'
export const chat_export_web_prefix = 'smb://example.com/dummy/'
export const genshin_stat_influxdb_host = 'whatever://redacted:1048576'
export const genshin_user_info: Record<string, GenshinUserInfo> = {
  [bot_owner]: {
    cookie: 'redacted',
    uid: 129116425,
  },
  [1]: {
    cookie: 'redacted',
    uid: 233,
  },
}
