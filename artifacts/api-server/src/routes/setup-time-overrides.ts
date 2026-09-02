import type { Shot } from "@workspace/api-zod";

type ShotWithOptionalOverride = Pick<Shot, "id" | "shotNumber"> & {
  setupTimeOverride?: unknown;
};

export function normalizeSetupTimeOverride(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export function normalizeShotOverrides<T extends ShotWithOptionalOverride>(
  shots: T[],
): Array<Omit<T, "setupTimeOverride"> & { setupTimeOverride: string | null }> {
  return shots.map((shot) => ({
    ...shot,
    setupTimeOverride: normalizeSetupTimeOverride(shot.setupTimeOverride),
  }));
}

export function preserveSetupTimeOverrides(
  nextShots: Shot[],
  currentShots: ShotWithOptionalOverride[],
) {
  const overridesById = new Map(
    currentShots
      .filter((shot) => normalizeSetupTimeOverride(shot.setupTimeOverride) !== null)
      .map((shot) => [shot.id, normalizeSetupTimeOverride(shot.setupTimeOverride)]),
  );
  const overridesByShotNumber = new Map(
    currentShots
      .filter((shot) => normalizeSetupTimeOverride(shot.setupTimeOverride) !== null)
      .map((shot) => [shot.shotNumber, normalizeSetupTimeOverride(shot.setupTimeOverride)]),
  );

  return nextShots.map((shot) => ({
    ...shot,
    // Prefer the stable id, but use shot number as a defensive fallback if
    // Gemini unexpectedly rewrites an otherwise retained shot id.
    setupTimeOverride:
      overridesById.get(shot.id) ??
      overridesByShotNumber.get(shot.shotNumber) ??
      null,
  }));
}