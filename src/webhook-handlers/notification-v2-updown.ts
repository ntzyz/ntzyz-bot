import { notification_v2_updown_token } from '../config'

const handler: WebhookHandler = (bot, req, res) => {
  if (req.query['access-token'] !== notification_v2_updown_token) {
    res.status(403).send('you shall not access')
    return
  }

  bot.telegram.sendMessage(req.params.receiverId, [`<b>${req.body.host}</b>: ${req.body.message}`].join('\n'), {
    parse_mode: 'HTML',
  })

  res.send('ok')
}

export default handler
