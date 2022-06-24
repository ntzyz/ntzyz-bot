import express from 'express'
import bodyParser from 'body-parser'
import { http_server_port } from '../config'

const server = express()

server.use(
  bodyParser.text({
    type: 'text/html',
  }),
)
server.use(bodyParser.json())

server.listen(http_server_port)

export function get_http_server(): ReturnType<typeof express> {
  return server
}
