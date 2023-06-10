export function seconds_to_human_readable(duration: number) {
  const hours = Math.floor(duration / 3600)
  const minutes = Math.floor(duration / 60) % 60
  const seconds = duration % 60

  let result = ''

  if (hours > 0) {
    result += `${hours} 时`
  }

  if (minutes > 0) {
    result += ` ${minutes} 分`
  }

  if (duration === 0) {
    result = null
  }

  return result
}
