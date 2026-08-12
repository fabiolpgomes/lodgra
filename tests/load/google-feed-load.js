import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  scenarios: {
    google_feed: {
      executor: 'constant-arrival-rate',
      duration: '30s',
      rate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 10,
      maxVUs: 50,
    },
  },
}

const baseUrl = __ENV.BASE_URL || 'http://localhost:3000'

export default function () {
  const responses = http.batch([
    `${baseUrl}/api/feeds/google-vacation-rentals?limit=500`,
    `${baseUrl}/api/feeds/google-vacation-rentals?limit=100&offset=0`,
    `${baseUrl}/api/feeds/google-vacation-rentals?limit=100&include_reviews=true`,
    `${baseUrl}/api/feeds/google-vacation-rentals?currency=EUR`,
  ])

  check(responses, {
    'all Google feed requests return 200': results => results.every(response => response.status === 200),
  })
  sleep(1)
}
