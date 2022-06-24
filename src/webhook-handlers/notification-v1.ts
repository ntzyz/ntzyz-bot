import { notification_v1_token } from '../config'

const handler: WebhookHandler = (bot, req, res) => {
  if (req.headers['x-access-token'] != notification_v1_token) {
    res.status(403).send('you shall not access')
    return
  }

  bot.telegram.sendMessage(req.params.receiverId, req.body, {
    parse_mode: 'HTML',
  })

  res.send('ok')
}

export default handler
