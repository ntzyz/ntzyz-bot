import { extract_parameters } from '../utils'

const handler: CommandHandler = (ctx) => {
  const parameters = extract_parameters(ctx.message.text)

  if (/^ping$/iu.test(parameters[0])) {
    ctx.reply('Pong!', {
      reply_to_message_id: ctx.message.message_id,
    })
    return
  }

  ctx.reply(parameters.join(' '), {
    reply_to_message_id: ctx.message.message_id,
  })
}

export default handler
