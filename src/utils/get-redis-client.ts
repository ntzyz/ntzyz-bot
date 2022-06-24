import { createClient } from 'redis'
import { redis_url } from '../config'

const client = createClient({
  url: redis_url,
})

client.connect()

export function get_redis_client() {
  return client
}
