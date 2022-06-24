const handler: CommandHandler = (ctx) => {
  let reply_text = `User Id: ${ctx.from.id}`

  if (ctx.chat.type !== 'private') {
    reply_text = `User Id: ${ctx.from.id}\nChat Id: ${ctx.chat.id}`
  }

  ctx.reply(reply_text, {
    reply_to_message_id: ctx.message.message_id
  });
}

export default handler
