import { ActionConfig } from 'custom-card-helpers';

type Loose = Record<string, unknown>;

const ACTION_KEYS = ['tap_action', 'hold_action', 'double_tap_action'] as const;

/**
 * Adapt an action config to what custom-card-helpers' handleAction understands,
 * without mutating it:
 * - `perform-action` (written by HA's ui_action selector) becomes `call-service`
 *   with `service = perform_action`;
 * - 1.6.0's `service_data` is passed on as `data` when `data` is absent.
 * Every other field is kept; any other action is returned as is.
 */
export function normalizeActionConfig(actionConfig: ActionConfig | undefined): ActionConfig | undefined {
  if (!actionConfig || typeof actionConfig !== 'object') return actionConfig;
  const config = actionConfig as unknown as Loose;
  const isPerform = config.action === 'perform-action';
  const needsData = config.data == null && config.service_data != null;
  if (!isPerform && !needsData) return actionConfig;

  const next: Loose = { ...config };
  if (isPerform) {
    next.action = 'call-service';
    next.service = config.perform_action ?? config.service;
  }
  if (needsData) next.data = config.service_data;
  return next as unknown as ActionConfig;
}

/** Copy `target` with its tap/hold/double-tap action configs normalized; returns `target` itself if nothing changes. */
export function normalizeActions<T extends object>(target: T): T {
  let next: T | undefined;
  for (const key of ACTION_KEYS) {
    const current = (target as Loose)[key] as ActionConfig | undefined;
    const normalized = normalizeActionConfig(current);
    if (normalized !== current) {
      next ??= { ...target };
      (next as Loose)[key] = normalized;
    }
  }
  return next ?? target;
}
