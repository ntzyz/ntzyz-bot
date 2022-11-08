export function format_genshin_transformer_time(
  recovery_time: GenshinImpact.GenshinResinResponse['data']['transformer']['recovery_time'],
) {
  return ((recovery_time.Day * 24 + recovery_time.Hour) * 60 + recovery_time.Minute) * 60 + recovery_time.Second
}
