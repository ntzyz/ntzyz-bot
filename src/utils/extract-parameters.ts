export function extract_parameters(raw_command: string) {
  const [, ...params] = raw_command.split(' ')

  return params
}
