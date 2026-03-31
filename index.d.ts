/**
 * @package @t8n/limit
 * @author ezetgalaxy
 * @license ISC
 *
 * Advanced rate limiter for the TitanPl Framework.
 *
 * @description
 * `@t8n/limit` provides a production-grade rate limiting system designed
 * for the TitanPL Gravity Runtime.
 *
 * It combines multiple real-world rate limiting algorithms used by
 * modern APIs such as Stripe, GitHub, and Cloudflare.
 *
 * Features include:
 *
 * • Burst protection (short spikes)
 * • Sustained traffic limits
 * • Token bucket smoothing
 * • Adaptive ban escalation
 *
 * All operations are synchronous and use Titan native storage (`ls`)
 * making the limiter compatible with the Titan runtime.
 *
 * @example
 * import Limit from "@t8n/limit"
 *
 * const limit = new Limit({
 *   burst: { window: 1000, max: 5 },
 *   sustained: { window: 60000, max: 50 }
 * })
 *
 * export function route(req) {
 *
 *   const rate = limit.ip(req)
 *
 *   if (!rate.allowed) {
 *     return { error: "Too many requests" }
 *   }
 *
 *   return { ok: true }
 * }
 */

import { TitanRequest } from "@titanpl/native"

export type { TitanRequest }



  
  /**
   * Burst limiter configuration.
   *
   * Controls short-term spikes.
   */
  export interface BurstConfig {
  
    /**
     * Time window in milliseconds.
     *
     * Example: `1000` = 1 second.
     */
    window: number
  
    /**
     * Maximum requests allowed during the window.
     */
    max: number
  
  }
  
  /**
   * Sustained limiter configuration.
   *
   * Controls long-term traffic.
   */
  export interface SustainedConfig {
  
    /**
     * Time window in milliseconds.
     */
    window: number
  
    /**
     * Maximum allowed requests during the window.
     */
    max: number
  
  }
  
  /**
   * Token bucket configuration.
   *
   * Used to smooth request bursts.
   */
  export interface BucketConfig {
  
    /**
     * Maximum number of tokens stored.
     */
    capacity: number
  
    /**
     * Number of tokens added per refill cycle.
     */
    refill: number
  
    /**
     * Refill interval in milliseconds.
     */
    interval: number
  
  }
  
  /**
   * Adaptive ban configuration.
   *
   * Automatically blocks clients after repeated violations.
   */
  export interface BanConfig {
  
    /**
     * Number of violations required before a ban is triggered.
     */
    threshold: number
  
    /**
     * Base ban duration in milliseconds.
     *
     * Each additional violation increases the duration.
     */
    base: number
  
  }
  
  /**
   * Limiter configuration.
   */
  export interface LimitConfig {
  
    /**
     * Storage prefix used internally for keys.
     */
    prefix?: string
  
    /**
     * Burst limiter settings.
     */
    burst?: BurstConfig
  
    /**
     * Sustained limiter settings.
     */
    sustained?: SustainedConfig
  
    /**
     * Token bucket settings.
     */
    bucket?: BucketConfig
  
    /**
     * Adaptive ban settings.
     */
    ban?: BanConfig
  
  }
  
  /**
   * Result returned by limiter checks.
   */
  export interface RateResult {
  
    /**
     * Whether the request is allowed.
     */
    allowed: boolean
  
    /**
     * Retry time in milliseconds before requests are allowed again.
     */
    retryIn?: number
  
  }
  
  /**
   * Titan rate limiter.
   *
   * @class
   */
  export default class Limit {
  
    /**
     * Create a new limiter instance.
     *
     * @param config Limiter configuration
     */
    constructor(config?: LimitConfig)
  
    /**
     * Apply rate limiting based on client IP.
     *
     * This method performs:
     *
     * 1. Adaptive ban check
     * 2. Burst limiter
     * 3. Sustained limiter
     * 4. Token bucket check
     *
     * @param req Titan request object
     * @returns Rate result
     *
     * @example
     * const rate = limit.ip(req)
     *
     * if (!rate.allowed) {
     *   return { error: "Too many requests" }
     * }
     */
    ip(req: TitanRequest): RateResult
  
    /**
     * Guard helper for Titan routes.
     *
     * Automatically returns a response when the request
     * exceeds rate limits.
     *
     * @param req Titan request
     *
     * @returns `null` if request allowed, otherwise a response object
     *
     * @example
     * const blocked = limit.guard(req)
     *
     * if (blocked) return blocked
     */
    guard(req: TitanRequest): any
  
  }