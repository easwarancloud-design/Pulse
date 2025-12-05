/**
 * Feature Flags
 * Centralized toggles for optional/probing behaviors.
 * Defaults: disable noisy probes in production builds.
 */

const isProd = process.env.NODE_ENV === 'production';

export const FEATURE_FLAGS = {
  // Master switch for all compatibility probing beyond simple health checks
  ENABLE_COMPATIBILITY_PROBES: !isProd,
  // Fine-grained probes
  PROBE_USER_CONVERSATIONS: !isProd,
  // Specifically gate the conversations/search?query=test readiness ping
  PROBE_SEARCH_ENDPOINT: false, // default off to avoid noisy logs anywhere
  // Verbose console logs for compatibility checks
  LOG_COMPATIBILITY_CHECKS: !isProd,
};

export const isProdBuild = () => isProd;
export const isCompatibilityProbesEnabled = () => FEATURE_FLAGS.ENABLE_COMPATIBILITY_PROBES;
export const shouldProbeUserConversations = () => FEATURE_FLAGS.ENABLE_COMPATIBILITY_PROBES && FEATURE_FLAGS.PROBE_USER_CONVERSATIONS;
export const shouldProbeSearchEndpoint = () => FEATURE_FLAGS.ENABLE_COMPATIBILITY_PROBES && FEATURE_FLAGS.PROBE_SEARCH_ENDPOINT;

export default FEATURE_FLAGS;
