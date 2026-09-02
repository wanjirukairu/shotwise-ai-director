import assert from "node:assert/strict";
import test from "node:test";
import type { Shot } from "@workspace/api-zod";
import { AnalyzeSceneBody } from "../../../../lib/api-zod/src/generated/api.ts";
import {
  normalizeShotOverrides,
  preserveSetupTimeOverrides,
} from "./setup-time-overrides.ts";

function shot(overrides: Partial<Shot> = {}): Shot {
  return {
    id: "shot-1",
    shotNumber: 1,
    shotType: "Master",
    framing: "Wide",
    angle: "Eye level",
    lens: "35mm",
    movement: "Static",
    lighting: "Window light",
    composition: "Centered",
    rationale: "Establishes the space.",
    equipment: ["Tripod"],
    crew: ["Director"],
    setupTime: "10–25 min",
    setupTimeOverride: null,
    locationRequirements: "Interior",
    vfxRequirements: "None",
    budgetImpact: "Low",
    feasibility: "easy",
    alternative: null,
    sourceType: "practical",
    computeGenerationCost: null,
    modelTool: null,
    promptIterationTime: null,
    consistencyAcrossShots: null,
    upscalingPostNeeds: null,
    referenceExamples: [],
    learningResources: [],
    ...overrides,
  };
}

test("re-reading an existing scene preserves its saved planning override", () => {
  const current = [shot({ setupTimeOverride: "20 min on this location" })];
  const revised = [
    shot({
      setupTime: "15–30 min depending on access",
      setupTimeOverride: "5 min",
    }),
  ];

  assert.equal(
    preserveSetupTimeOverrides(revised, current)[0].setupTimeOverride,
    "20 min on this location",
  );
});

test("scene analysis requires the existing project and scene identities", () => {
  const analysis = {
    sceneText: "INT. STUDIO - DAY\nA director studies the empty set.",
    resources: "One location",
    budget: "Low",
    equipment: "Tripod",
    crewExperience: "Small professional crew",
    history: [],
  };

  assert.equal(AnalyzeSceneBody.safeParse(analysis).success, false);
  assert.equal(
    AnalyzeSceneBody.safeParse({
      ...analysis,
      projectId: "project-1",
      sceneId: "scene-1",
    }).success,
    true,
  );
});

test("uses shot number as a fallback and rejects model-only overrides", () => {
  const current = [shot({ id: "saved-shot", setupTimeOverride: "45 min" })];
  const revised = [
    shot({ id: "rewritten-shot", setupTimeOverride: "2 min" }),
    shot({ id: "new-shot", shotNumber: 2, setupTimeOverride: "3 min" }),
  ];

  const result = preserveSetupTimeOverrides(revised, current);
  assert.equal(result[0].setupTimeOverride, "45 min");
  assert.equal(result[1].setupTimeOverride, null);
});

test("normalizes legacy shots that do not have an override field", () => {
  const legacyShot = { ...shot(), setupTimeOverride: undefined };
  const [normalized] = normalizeShotOverrides([legacyShot]);

  assert.equal(normalized.setupTimeOverride, null);
});