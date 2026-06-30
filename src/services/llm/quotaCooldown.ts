import { config } from "../../config/index.js";

/** Earliest time we may call the LLM again after a 429. */
let cooldownUntil = 0;

export function isLlmInCooldown(): boolean {
  return Date.now() < cooldownUntil;
}

export function getLlmCooldownRemainingMs(): number {
  return Math.max(0, cooldownUntil - Date.now());
}

export function startLlmCooldown(): void {
  cooldownUntil = Date.now() + config.LLM_QUOTA_COOLDOWN_MS;
}

export function clearLlmCooldown(): void {
  cooldownUntil = 0;
}
