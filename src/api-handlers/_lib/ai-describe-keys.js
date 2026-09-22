// The API keys the AI Description Engine may use, in the order it tries them.
//
// There used to be exactly one, read inline as process.env.NVIDIA_API_KEY, so a
// key that hit its quota took the whole feature down for every vendor until it
// reset, and the admin panel could not say which key was in trouble because it
// did not know keys existed.
//
// Adding a second key is now an environment variable and nothing else:
//
//   NVIDIA_API_KEY          -> label "primary"
//   NVIDIA_API_KEY_2        -> label "key 2"
//   NVIDIA_API_KEY_BACKUP   -> label "backup"
//
// Any NVIDIA_API_KEY_<SUFFIX> is picked up. The suffix is only a name for the
// dashboard; the order is primary first, then the rest alphabetically, so it
// stays the same between deploys and the logs stay comparable.

const PREFIX = 'NVIDIA_API_KEY'

/** Last four characters only. A key must never reach a browser, even an admin's. */
export function maskKey(key) {
  const s = String(key || '')
  if (s.length < 8) return '****'
  return `****${s.slice(-4)}`
}

function labelFor(suffix) {
  if (!suffix) return 'primary'
  // NVIDIA_API_KEY_2 -> "key 2", NVIDIA_API_KEY_BACKUP -> "backup"
  const clean = suffix.replace(/^_/, '').toLowerCase().replace(/_/g, ' ').trim()
  return /^\d+$/.test(clean) ? `key ${clean}` : clean
}

/**
 * Every configured key, deduplicated. Two variables holding the same secret
 * would otherwise look like two keys and the failover would retry the same
 * quota twice.
 */
export function getDescribeKeys(env = process.env) {
  const found = []
  const seen = new Set()

  const add = (name, value) => {
    const key = String(value || '').trim()
    if (!key || seen.has(key)) return
    seen.add(key)
    found.push({ label: labelFor(name.slice(PREFIX.length)), env: name, key, hint: maskKey(key) })
  }

  add(PREFIX, env[PREFIX])

  Object.keys(env)
    .filter((name) => name.startsWith(`${PREFIX}_`))
    .sort()
    .forEach((name) => add(name, env[name]))

  return found
}

/** Labels and masked hints only: safe to send to the admin dashboard. */
export function describeKeysForAdmin(env = process.env) {
  return getDescribeKeys(env).map(({ label, env: name, hint }) => ({ label, env: name, hint }))
}
