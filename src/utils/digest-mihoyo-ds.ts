import crypto from 'crypto'

function md5sum(str: string) {
  return crypto.createHash('md5').update(str).digest('hex')
}

export function digest_mihoyo_ds(uid: number, server = 'cn_gf01') {
  const salt = 'xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs'
  const timestamp = Math.floor(Date.now() / 1000)
  const random = Math.floor(Math.random() * 100000) + 100001
  const body = ''
  const qs = `role_id=${uid}&server=${server}`

  return [
    timestamp,
    random,
    md5sum('salt=' + salt + '&t=' + timestamp + '&r=' + random + '&b=' + body + '&q=' + qs),
  ].join(',')
}

function randomString(length = 6) {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  return [...new Array(length).keys()]
    .map(() => characters.charAt(Math.floor(characters.length * Math.random())))
    .join('')
}

export function digest_hoyolab_ds() {
  const salt = '6s25p5ox5y14umn1p61aqyyvbvvl3lrt'
  const timestamp = Math.floor(Date.now() / 1000)
  const random = randomString(6)

  return [timestamp, random, md5sum('salt=' + salt + '&t=' + timestamp + '&r=' + random)].join(',')
}
