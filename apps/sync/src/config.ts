import type { AppConfig } from './app';

export type Env = Record<string, string | undefined>;

export class ConfigError extends Error {}

/**
 * Reads the shared env vars (both runtimes):
 * - FAMILY_CODE   (required, >= 8 chars) the code family members type in
 * - TOKEN_SECRET  (required, >= 32 chars) HMAC secret for tokens
 * - CORS_ORIGINS  (optional) comma-separated allowed origins, default '*'
 */
export function configFromEnv(env: Env): AppConfig {
  const familyCode = env.FAMILY_CODE?.trim() ?? '';
  const tokenSecret = env.TOKEN_SECRET?.trim() ?? '';
  if (familyCode.length < 8)
    throw new ConfigError('FAMILY_CODE must be set (at least 8 characters)');
  if (tokenSecret.length < 32)
    throw new ConfigError('TOKEN_SECRET must be set (at least 32 characters)');
  const origins = env.CORS_ORIGINS?.trim();
  return {
    familyCode,
    tokenSecret,
    corsOrigins:
      !origins || origins === '*'
        ? '*'
        : origins
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
  };
}
