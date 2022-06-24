import { notification_v2_telegraf_token } from '../config'

const handler: WebhookHandler = (bot, req, res) => {
  if (req.query['access-token'] !== notification_v2_telegraf_token) {
    res.status(403).send('you shall not access')
    return
  }

  bot.telegram.sendMessage(
    req.params.receiverId,
    [`<b>${req.body.title}</b>`, `Rule: ${req.body.ruleName}`, `Message: ${req.body.message}`].join('\n'),
    { parse_mode: 'HTML' },
  )

  res.send('ok')
}

export default handler
