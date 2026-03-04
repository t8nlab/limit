import "@titanpl/node/globals"
import { ls, time, crypto, response } from "@titanpl/native"

class Limit {

  constructor(config = {}) {

    this.prefix = config.prefix || "t8n:limit"

    /* burst protection */
    this.burst = config.burst || { window: 1000, max: 5 }

    /* sustained protection */
    this.sustained = config.sustained || { window: 60000, max: 50 }

    /* token bucket */
    this.bucket = config.bucket || {
      capacity: 20,
      refill: 5,
      interval: 1000
    }

    /* adaptive bans */
    this.ban = config.ban || {
      threshold: 5,
      base: 60000
    }

  }

  /* ---------------- REQUEST HELPERS ---------------- */

  _getIP(req) {

    if (!req?.headers) return "global"

    const h = req.headers

    return (
      h["x-forwarded-for"]?.split(",")[0] ||
      h["cf-connecting-ip"] ||
      h["x-real-ip"] ||
      "global"
    )

  }

  /* ---------------- STORAGE ---------------- */

  _key(type, id) {

    const hash = crypto.hash("sha256", String(id))

    return `${this.prefix}:${type}:${hash}`

  }

  _read(key) {

    try {

      const raw = ls.get(key)

      if (!raw) return null

      return JSON.parse(raw)

    } catch {

      ls.remove(key)
      return null

    }

  }

  _write(key, data) {

    try {
      ls.set(key, JSON.stringify(data))
    } catch { }

  }

  /* ---------------- RING BUFFER WINDOW ---------------- */

  _ring(type, id, max, window) {

    const key = this._key(type, id)

    const now = time.now()

    let data = this._read(key)

    if (!data) {
      data = {
        i: 0,
        list: new Array(max).fill(0)
      }
    }

    const list = data.list

    let count = 0

    /* count valid timestamps */

    for (let t of list) {
      if (now - t < window && t !== 0) count++
    }

    if (count >= max) {

      /* find oldest valid timestamp */

      let oldest = now

      for (let t of list) {
        if (t !== 0 && now - t < window && t < oldest) {
          oldest = t
        }
      }

      return {
        allowed: false,
        retryIn: window - (now - oldest)
      }

    }

    /* write timestamp into ring */

    list[data.i] = now

    data.i = (data.i + 1) % max

    this._write(key, data)

    return { allowed: true }

  }

  /* ---------------- TOKEN BUCKET ---------------- */

  _bucket(id) {

    const key = this._key("bucket", id)

    const now = time.now()

    let data = this._read(key)

    if (!data) {
      data = {
        tokens: this.bucket.capacity,
        last: now
      }
    }

    const elapsed = now - data.last

    const refill = Math.floor(elapsed / this.bucket.interval) * this.bucket.refill

    if (refill > 0) {
      data.tokens = Math.min(this.bucket.capacity, data.tokens + refill)
      data.last = now
    }

    if (data.tokens <= 0) {

      this._write(key, data)

      return {
        allowed: false,
        retryIn: this.bucket.interval
      }

    }

    data.tokens--

    this._write(key, data)

    return { allowed: true }

  }

  /* ---------------- ADAPTIVE BAN ---------------- */

  _ban(id) {

    const key = this._key("ban", id)

    const now = time.now()

    let data = this._read(key)

    if (!data) {
      data = { fails: 0, until: 0 }
    }

    if (data.until > now) {
      return {
        allowed: false,
        retryIn: data.until - now
      }
    }

    return { allowed: true }

  }

  _recordFail(id) {

    const key = this._key("ban", id)

    let data = this._read(key) || { fails: 0, until: 0 }

    data.fails++

    if (data.fails >= this.ban.threshold) {

      const duration = this.ban.base * data.fails

      data.until = time.now() + duration

    }

    this._write(key, data)

  }

  /* ---------------- MAIN CHECK ---------------- */

  ip(req) {

    const id = this._getIP(req)

    /* ban check */

    const ban = this._ban(id)

    if (!ban.allowed) return ban

    /* burst */

    const burst = this._ring(
      "burst",
      id,
      this.burst.max,
      this.burst.window
    )

    if (!burst.allowed) {
      this._recordFail(id)
      return burst
    }

    /* sustained */

    const sustained = this._ring(
      "sustained",
      id,
      this.sustained.max,
      this.sustained.window
    )

    if (!sustained.allowed) {
      this._recordFail(id)
      return sustained
    }

    /* token bucket */

    const bucket = this._bucket(id)

    if (!bucket.allowed) {
      this._recordFail(id)
      return bucket
    }

    return { allowed: true }

  }

  /* ---------------- GUARD ---------------- */

  guard(req) {

    const rate = this.ip(req)

    if (!rate.allowed) {

      return response.json({
        error: "Too many requests",
        retryIn: rate.retryIn
      })

    }

    return null

  }

}

export default Limit