import crypto from 'crypto'

function md5sum(str: string) {
  return crypto.createHash('md5').update(str).digest('hex')
}

export function digest_mihoyo_ds(uid: number) {
  const salt = 'xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs'
  const timestamp = Math.floor(Date.now() / 1000)
  const random = Math.floor(Math.random() * 100000) + 100001
  const body = ''
  const qs = `role_id=${uid}&server=cn_gf01`

  return [
    timestamp,
    random,
    md5sum('salt=' + salt + '&t=' + timestamp + '&r=' + random + '&b=' + body + '&q=' + qs),
  ].join(',')
}
