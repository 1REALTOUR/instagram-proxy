import { createServer } from 'node:http'

const PORT = process.env.PORT || 3100
const API_KEY = process.env.PROXY_API_KEY || ''

const IG_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'X-IG-App-ID': '936619743392459',
  'X-Requested-With': 'XMLHttpRequest',
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://www.instagram.com/',
  Origin: 'https://www.instagram.com',
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)

  // Health check (no auth required — used by Docker HEALTHCHECK)
  if (url.pathname === '/health') {
    return json(res, 200, { ok: true })
  }

  // Auth check
  if (API_KEY) {
    const auth = req.headers['authorization']
    if (auth !== `Bearer ${API_KEY}`) {
      return json(res, 401, { error: 'Unauthorized' })
    }
  }

  // Fetch Instagram profile data
  if (url.pathname === '/profile') {
    const username = url.searchParams.get('username')
    if (!username) {
      return json(res, 400, { error: 'Missing username parameter' })
    }

    try {
      const igRes = await fetch(
        `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
        { headers: IG_HEADERS },
      )

      if (!igRes.ok) {
        const text = await igRes.text()
        return json(res, igRes.status, {
          error: `Instagram returned ${igRes.status}`,
          body: text.substring(0, 500),
        })
      }

      const data = await igRes.json()
      return json(res, 200, data)
    } catch (err) {
      return json(res, 500, { error: err.message })
    }
  }

  // Fetch individual post details (for carousels)
  if (url.pathname === '/post') {
    const shortcode = url.searchParams.get('shortcode')
    if (!shortcode) {
      return json(res, 400, { error: 'Missing shortcode parameter' })
    }

    try {
      const queryHash = 'b3055c01b4b222b8a47dc12b090e4e64'
      const variables = JSON.stringify({
        shortcode,
        child_comment_count: 0,
        fetch_comment_count: 0,
        parent_comment_count: 0,
        has_threaded_comments: false,
      })

      const igRes = await fetch(
        `https://www.instagram.com/graphql/query/?query_hash=${queryHash}&variables=${encodeURIComponent(variables)}`,
        { headers: IG_HEADERS },
      )

      if (!igRes.ok) {
        const text = await igRes.text()
        return json(res, igRes.status, {
          error: `Instagram returned ${igRes.status}`,
          body: text.substring(0, 500),
        })
      }

      const data = await igRes.json()
      return json(res, 200, data)
    } catch (err) {
      return json(res, 500, { error: err.message })
    }
  }

  json(res, 404, { error: 'Not found' })
})

server.listen(PORT, () => {
  console.log(`Instagram proxy listening on port ${PORT}`)
})
