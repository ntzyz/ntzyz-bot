import fetch from 'node-fetch'
import { fixer_key } from '../config'
import { extract_parameters } from '../utils'

const available_currencies = ["EUR","AED","AFN","ALL","AMD","ANG","AOA","ARS","AUD","AWG","AZN","BAM","BBD","BDT","BGN","BHD","BIF","BMD","BND","BOB","BRL","BSD","BTC","BTN","BWP","BYN","BYR","BZD","CAD","CDF","CHF","CLF","CLP","CNY","CNH","COP","CRC","CUC","CUP","CVE","CZK","DJF","DKK","DOP","DZD","EGP","ERN","ETB","EUR","FJD","FKP","GBP","GEL","GGP","GHS","GIP","GMD","GNF","GTQ","GYD","HKD","HNL","HRK","HTG","HUF","IDR","ILS","IMP","INR","IQD","IRR","ISK","JEP","JMD","JOD","JPY","KES","KGS","KHR","KMF","KPW","KRW","KWD","KYD","KZT","LAK","LBP","LKR","LRD","LSL","LTL","LVL","LYD","MAD","MDL","MGA","MKD","MMK","MNT","MOP","MRU","MUR","MVR","MWK","MXN","MYR","MZN","NAD","NGN","NIO","NOK","NPR","NZD","OMR","PAB","PEN","PGK","PHP","PKR","PLN","PYG","QAR","RON","RSD","RUB","RWF","SAR","SBD","SCR","SDG","SEK","SGD","SHP","SLE","SLL","SOS","SRD","STD","SVC","SYP","SZL","THB","TJS","TMT","TND","TOP","TRY","TTD","TWD","TZS","UAH","UGX","USD","UYU","UZS","VEF","VES","VND","VUV","WST","XAF","XAG","XAU","XCD","XDR","XOF","XPF","YER","ZAR","ZMK","ZMW","ZWL"];

const handler: CommandHandler = async (ctx) => {
  const [amount_string, pair] = extract_parameters(ctx.message.text)
  const amount = Number((amount_string || '').replace(/,/g, ''))
  const [from, to] = (pair || '').split('/').map(item => item.toUpperCase())

  if (Number.isNaN(amount) || !from || !to) {
    ctx.reply(
      'Usage: /fxc [amount] [currency pair]\nExample: <code>/fxc 10,000 USD/CNY</code>',
      {
        reply_to_message_id: ctx.message.message_id,
        disable_web_page_preview: true,
        parse_mode: 'HTML',
      },
    )
    return
  }

  for (const currency of [from, to]) {
    if (!available_currencies.includes(currency)) {
      ctx.reply(
        `Currency ${currency} not support!`,
        {
          reply_to_message_id: ctx.message.message_id,
        }
      )
      return
    }
  }
  
  const response = await fetch(`http://data.fixer.io/api/latest?access_key=${fixer_key}`, {
    headers: {
      ['user-agent']: 'curl/7.54.0',
    },
  })

  const json = (await response.json()) as Fixer.LatestFXRateResponse

  if (!json.success) {
    ctx.reply(
      `API Error!`,
      {
        reply_to_message_id: ctx.message.message_id,
      }
    )
    return
  }

  ctx.reply(
    `${amount} ${from} = ${(amount / json.rates[from] * json.rates[to]).toFixed(5)} ${to}`,
    {
      reply_to_message_id: ctx.message.message_id,
      disable_web_page_preview: true,
      parse_mode: 'Markdown',
    },
  )
}

export default handler
