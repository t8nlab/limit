# @t8n/limit

Advanced rate limiter for the **TitanPL Framework**.

`@t8n/limit` provides a production-grade rate limiting system designed specifically for the **TitanPL Gravity Runtime**.

It combines multiple real-world rate limiting strategies used by modern API infrastructures such as **Stripe, GitHub, and Cloudflare** to protect routes against abuse, bots, and request floods.

The limiter runs **fully synchronous** and uses **Titan native storage (`ls`)**, making it safe and deterministic inside the Gravity V8 runtime.

---

# Features

### Multi-layer Protection

Instead of relying on a single algorithm, the limiter combines several strategies.

| Layer                | Purpose                                         |
| -------------------- | ----------------------------------------------- |
| **Burst Protection** | Stops rapid request spikes (ex: spam clicks)    |
| **Sustained Limits** | Controls long-term traffic volume               |
| **Token Bucket**     | Smooths request flow and prevents sudden spikes |
| **Adaptive Bans**    | Automatically bans abusive clients              |

---

# Installation

```bash
npm install @t8n/limit
```

---

# Quick Example

```javascript
import Limit from "@t8n/limit"

const limit = new Limit({
  burst: { window: 1000, max: 5 },
  sustained: { window: 60000, max: 50 }
})

export function route(req) {

  const rate = limit.ip(req)

  if (!rate.allowed) {
    return { error: "Too many requests" }
  }

  return { ok: true }
}
```

---

# Guard Helper (Recommended)

The `guard()` helper automatically returns a Titan response when the limit is exceeded.

```javascript
import Limit from "@t8n/limit"

const limit = new Limit()

export function route(req) {

  const blocked = limit.guard(req)

  if (blocked) return blocked

  return { ok: true }
}
```

Example response:

```json
{
  "error": "Too many requests",
  "retryIn": 1200
}
```

---

# How It Works

Each request goes through **four stages**:

```
Client Request
      │
      ▼
Adaptive Ban Check
      │
      ▼
Burst Limiter
      │
      ▼
Sustained Limiter
      │
      ▼
Token Bucket
      │
      ▼
Request Allowed
```

If any stage fails, the request is rejected.

---

# Algorithms Used

## Burst Limiter

Uses a **ring buffer window** to detect request spikes.

Example:

```
5 requests allowed every 1 second
```

Protects against:

* Button spam
* Rapid bot requests
* Refresh abuse

---

## Sustained Limiter

Controls traffic across longer windows.

Example:

```
50 requests allowed every 60 seconds
```

Protects against:

* Scripted API scraping
* Continuous background abuse

---

## Token Bucket

Smooths request bursts by allowing short spikes while maintaining long-term limits.

Example:

```
Capacity: 20 tokens
Refill: 5 tokens / second
```

Each request consumes **1 token**.

---

## Adaptive Ban

Tracks repeated violations.

If a client repeatedly hits limits:

```
fail 1 → warning
fail 5 → temporary ban
fail 10 → longer ban
```

Ban duration increases automatically.

---

# Configuration

```javascript
const limit = new Limit({

  prefix: "t8n:limit",

  burst: {
    window: 1000,
    max: 5
  },

  sustained: {
    window: 60000,
    max: 50
  },

  bucket: {
    capacity: 20,
    refill: 5,
    interval: 1000
  },

  ban: {
    threshold: 5,
    base: 60000
  }

})
```

---

# Configuration Reference

### `prefix`

Storage prefix used internally.

```
Default: "t8n:limit"
```

---

### `burst`

Short-term spike protection.

```javascript
burst: {
  window: 1000,
  max: 5
}
```

Meaning:

```
5 requests allowed every 1 second
```

---

### `sustained`

Long-term traffic control.

```javascript
sustained: {
  window: 60000,
  max: 50
}
```

Meaning:

```
50 requests per minute
```

---

### `bucket`

Token bucket smoothing.

```javascript
bucket: {
  capacity: 20,
  refill: 5,
  interval: 1000
}
```

Meaning:

```
20 requests instantly allowed
5 tokens refilled every second
```

---

### `ban`

Automatic abuse bans.

```javascript
ban: {
  threshold: 5,
  base: 60000
}
```

Meaning:

```
5 violations → temporary ban
ban duration grows with each violation
```

---

# Titan Request Support

The limiter reads client IP from headers automatically.

Supported headers:

```
x-forwarded-for
cf-connecting-ip
x-real-ip
```

If no IP is detected, it falls back to a **global limiter**.

---

# Example Production Setup

Typical API protection setup:

```javascript
const limit = new Limit({

  burst: { window: 1000, max: 10 },

  sustained: { window: 60000, max: 200 },

  bucket: {
    capacity: 40,
    refill: 10,
    interval: 1000
  },

  ban: {
    threshold: 10,
    base: 60000
  }

})
```

This configuration allows:

```
10 requests/sec
200 requests/min
40 burst tokens
automatic abuse bans
```

---

# Performance

Designed for **TitanPL's Gravity runtime architecture**:

* synchronous execution
* V8 isolate safe
* deterministic state
* minimal memory usage
* no async operations

Storage uses **Titan native `ls`**.

---

# Best Practices

Recommended pattern:

```
1 limiter instance per route group
```

Example:

```
/api/auth/*
/api/user/*
/api/public/*
```

Each group can use different limits.

---

# License

ISC License
