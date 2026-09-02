import type { Shot } from '@workspace/api-client-react';

export function getEffectiveSetupTime(
  shot: Pick<Shot, 'setupTime' | 'setupTimeOverride'>,
) {
  return shot.setupTimeOverride?.trim() ? shot.setupTimeOverride : shot.setupTime;
}