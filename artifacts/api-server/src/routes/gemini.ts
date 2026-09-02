import { Router, type IRouter } from "express";
import { GoogleGenAI } from "@google/genai";
import { and, eq } from "drizzle-orm";
import { db, projectsTable, scenesTable } from "@workspace/db";
import {
  AnalyzeSceneBody,
  AnalyzeSceneResponse,
  StreamDirectorResponseBody,
  type ChatMessage,
  type Shot,
} from "@workspace/api-zod";
import { getUserId } from "../lib/auth";
import { preserveSetupTimeOverrides } from "./setup-time-overrides";

const router: IRouter = Router();

const DIRECTING_SYSTEM_PROMPT = `You are ShotWise, an experienced film director's assistant.
Your job is to help a director make intentional, shootable choices. Read the scene for story
intent first, then propose a concise shot list that serves the emotion and action. You must
respect the stated equipment, crew, time, and budget constraints. When a choice is ambitious,
push back clearly and offer a cheaper alternative that preserves the intent.

Return ONLY valid JSON matching this exact shape:
{
  "message": "A conversational response to the director, with useful pushback where relevant.",
  "shots": [
    {
      "id": "shot-1",
      "shotNumber": 1,
      "shotType": "Master",
      "framing": "Wide two-shot",
      "angle": "Eye level",
      "lens": "35mm",
      "movement": "Static on tripod",
      "lighting": "Motivated window light with negative fill",
      "composition": "Describe the visual arrangement and focus.",
      "rationale": "Explain the story or emotional purpose.",
      "equipment": ["Tripod"],
      "crew": ["Director", "DP"],
      "setupTime": "10–25 min depending on crew familiarity and location access",
      "setupTimeOverride": null,
      "locationRequirements": "Describe requirements.",
      "vfxRequirements": "None",
      "budgetImpact": "Low",
      "feasibility": "easy",
      "alternative": null,
      "sourceType": "practical",
      "computeGenerationCost": null,
      "modelTool": null,
      "promptIterationTime": null,
      "consistencyAcrossShots": null,
      "upscalingPostNeeds": null,
      "referenceExamples": [
        {
          "title": "A concise label for the comparable technique",
          "work": "A real film, documentary, or music video",
          "medium": "film",
          "technique": "Explain the relevant craft connection in your own words without quoting copyrighted material.",
          "url": null
        }
      ],
      "learningResources": []
    }
  ],
  "readyToLock": false
}

Use feasibility exactly as one of:
- "easy": green; achievable with the stated budget, available equipment, and crew experience.
- "needs-time-or-gear": yellow/amber; requires extra time, equipment, or specialist support.
- "complex": red; expensive, operationally complex, or materially beyond the stated resources.

Every setupTime must be an honest range, never a single number. State the main variables that
could move it within that range. setupTimeOverride must be null unless the current shot already
has a director-entered override. A non-null setupTimeOverride is authoritative: preserve it exactly
and use it for all downstream planning instead of setupTime.

When feasibility is "needs-time-or-gear" or "complex", alternative must propose a cheaper or
simpler option and explain the creative trade-off. For example, if no dolly is available, suggest
handheld or static coverage and explain what changes emotionally or compositionally. Use a null
alternative only when the shot is genuinely easy with current resources. Keep the shot list
practical, specific, and readable by a DP and crew.`;

const FREE_CRAFT_RESOURCES = [
  {
    title: "ARRI filmmaker interviews and technical talks",
    kind: "Cinematographer interviews",
    url: "https://www.youtube.com/@ARRIChannel",
  },
  {
    title: "Cooke Optics cinematography conversations",
    kind: "Cinematographer interviews",
    url: "https://www.youtube.com/@cookeoptics",
  },
  {
    title: "BAFTA filmmaking masterclasses and interviews",
    kind: "Filmmaker interviews",
    url: "https://www.youtube.com/@BAFTA",
  },
  {
    title: "Criterion Collection essays and interviews",
    kind: "Articles and interviews",
    url: "https://www.criterion.com/current",
  },
];

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenAI({ apiKey });
}

function parseModelJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return JSON.parse(fenced?.[1] ?? trimmed);
}

function formatHistory(history: ChatMessage[]) {
  if (history.length === 0) return "No conversation yet.";
  return history
    .slice(-8)
    .map((entry) => `${entry.role === "director" ? "DIRECTOR" : "SHOTWISE"}: ${entry.content}`)
    .join("\n");
}

function formatShots(shots: Shot[]) {
  if (shots.length === 0) return "No shots have been proposed yet.";
  return JSON.stringify(
    shots.map((shot) => ({
      id: shot.id,
      shotNumber: shot.shotNumber,
      shotType: shot.shotType,
      framing: shot.framing,
      angle: shot.angle,
      lens: shot.lens,
      movement: shot.movement,
      rationale: shot.rationale,
      equipment: shot.equipment,
      crew: shot.crew,
      setupTime: shot.setupTime,
      setupTimeOverride: shot.setupTimeOverride,
      budgetImpact: shot.budgetImpact,
      feasibility: shot.feasibility,
      alternative: shot.alternative,
      sourceType: shot.sourceType,
      computeGenerationCost: shot.computeGenerationCost,
      modelTool: shot.modelTool,
      promptIterationTime: shot.promptIterationTime,
      consistencyAcrossShots: shot.consistencyAcrossShots,
      upscalingPostNeeds: shot.upscalingPostNeeds,
      referenceExamples: shot.referenceExamples,
      learningResources: shot.learningResources,
    })),
  );
}

function formatRevisionShots(shots: Shot[]) {
  if (shots.length === 0) return "No shots have been proposed yet.";
  return JSON.stringify(
    shots.map((shot) => ({
      id: shot.id,
      shotNumber: shot.shotNumber,
      shotType: shot.shotType,
      framing: shot.framing,
      angle: shot.angle,
      lens: shot.lens,
      movement: shot.movement,
      lighting: shot.lighting,
      composition: shot.composition,
      rationale: shot.rationale,
      setupTime: shot.setupTime,
      setupTimeOverride: shot.setupTimeOverride,
      feasibility: shot.feasibility,
      alternative: shot.alternative,
      sourceType: shot.sourceType,
    })),
  );
}

function formatRevisionHistory(history: ChatMessage[]) {
  if (history.length === 0) return "No conversation yet.";
  return history
    .slice(-4)
    .map((entry) => {
      const content = entry.content.length > 600 ? `${entry.content.slice(0, 600)}…` : entry.content;
      return `${entry.role === "director" ? "DIRECTOR" : "SHOTWISE"}: ${content}`;
    })
    .join("\n");
}

function parsePlan(raw: unknown) {
  if (raw && typeof raw === "object" && "shots" in raw && Array.isArray(raw.shots)) {
    raw.shots = raw.shots.map((shot: unknown) => {
      if (!shot || typeof shot !== "object") return shot;
      return {
        ...shot,
        setupTimeOverride:
          "setupTimeOverride" in shot && typeof shot.setupTimeOverride === "string"
            ? shot.setupTimeOverride
            : null,
        sourceType: "sourceType" in shot ? shot.sourceType : "practical",
        computeGenerationCost: "computeGenerationCost" in shot ? shot.computeGenerationCost : null,
        modelTool: "modelTool" in shot ? shot.modelTool : null,
        promptIterationTime: "promptIterationTime" in shot ? shot.promptIterationTime : null,
        consistencyAcrossShots: "consistencyAcrossShots" in shot ? shot.consistencyAcrossShots : null,
        upscalingPostNeeds: "upscalingPostNeeds" in shot ? shot.upscalingPostNeeds : null,
        referenceExamples:
          "referenceExamples" in shot && Array.isArray(shot.referenceExamples)
            ? shot.referenceExamples.map((reference) => {
                if (!reference || typeof reference !== "object") return reference;
                return { ...reference, url: null };
              })
            : [],
        learningResources: FREE_CRAFT_RESOURCES,
      };
    });
  }
  return AnalyzeSceneResponse.omit({ projectId: true, sceneId: true }).parse(raw);
}
function modeInstruction(challengeMode: boolean) {
  if (!challengeMode) {
    return `DIRECTING MODE: NORMAL
Respond directly and helpfully to the director's request. Explain the emotional, narrative,
and practical reasoning behind your choices, but do not require the director to justify a choice
before you help revise or confirm it.`;
  }

  return `DIRECTING MODE: CHALLENGE
Do not automatically agree to a newly requested shot or production choice. Before adding or
confirming it, challenge the director to articulate three things:
1. Emotional purpose: what should the audience or character feel?
2. Narrative purpose: what story information, relationship, power shift, or beat does it serve?
3. Practical purpose: why is this the right use of the available location, equipment, crew, time,
and budget?

If the latest director message proposes a shot but does not answer those questions, ask one or
two concise, specific "why" questions in the message and return the current shot list unchanged.
Do not pretend the requested shot has been approved, and do not factor unconfirmed reasoning into
the shot details yet. If the director has already explained the purpose, proceed with the revision,
explicitly connect that reasoning to framing, movement, lens, lighting, location, equipment, crew,
setup time, budget, and any cheaper alternative. Challenge constructively, never obstructively.
The message should make clear what answer would let you proceed.`;
}

function createGeminiRequest(prompt: string) {
  const ai = getClient();
  return {
    ai,
    request: {
    model: "gemini-3.6-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: DIRECTING_SYSTEM_PROMPT,
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
    },
    },
  };
}

async function askGemini(prompt: string) {
  const { ai, request } = createGeminiRequest(prompt);
  const response = await ai.models.generateContent(request);

  if (!response.text) {
    throw new Error("Gemini returned an empty response");
  }

  return parseModelJson(response.text);
}

function extractMessagePrefix(jsonText: string): string {
  const keyIndex = jsonText.indexOf('"message"');
  if (keyIndex < 0) return "";
  const colonIndex = jsonText.indexOf(":", keyIndex + 9);
  if (colonIndex < 0) return "";
  const quoteIndex = jsonText.indexOf('"', colonIndex + 1);
  if (quoteIndex < 0) return "";

  let result = "";
  for (let index = quoteIndex + 1; index < jsonText.length; index += 1) {
    const char = jsonText[index];
    if (char === '"') break;
    if (char !== "\\") {
      result += char;
      continue;
    }

    const escaped = jsonText[index + 1];
    if (escaped == null) break;
    if (escaped === "u") {
      const hex = jsonText.slice(index + 2, index + 6);
      if (!/^[0-9a-f]{4}$/i.test(hex)) break;
      result += String.fromCharCode(Number.parseInt(hex, 16));
      index += 5;
      continue;
    }

    const escapes: Record<string, string> = {
      '"': '"',
      "\\": "\\",
      "/": "/",
      b: "\b",
      f: "\f",
      n: "\n",
      r: "\r",
      t: "\t",
    };
    result += escapes[escaped] ?? escaped;
    index += 1;
  }
  return result;
}

async function streamGemini(
  prompt: string,
  onDelta: (text: string) => void,
) {
  const { ai, request } = createGeminiRequest(prompt);
  const stream = await ai.models.generateContentStream(request);
  let raw = "";
  let visibleLength = 0;

  for await (const chunk of stream) {
    if (!chunk.text) continue;
    raw += chunk.text;
    const visible = extractMessagePrefix(raw);
    if (visible.length > visibleLength) {
      onDelta(visible.slice(visibleLength));
      visibleLength = visible.length;
    }
  }

  return parseModelJson(raw);
}

export function prepareAnalysisPlan(raw: unknown, currentShots: Shot[]) {
  const parsedPlan = parsePlan(raw);
  return {
    ...parsedPlan,
    shots: preserveSetupTimeOverrides(parsedPlan.shots, currentShots),
  };
}

router.post("/gemini/analyze", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const parsed = AnalyzeSceneBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please provide a scene of at least 20 characters." });
    return;
  }

  const {
    sceneText,
    resources,
    budget,
    equipment,
    crewExperience,
    history,
    challengeMode = false,
    projectId,
    sceneId,
  } = parsed.data;

  if (!projectId || !sceneId) {
    res.status(400).json({ error: "A project and scene are required for analysis." });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));
  const [scene] = await db
    .select()
    .from(scenesTable)
    .where(
      and(
        eq(scenesTable.id, sceneId),
        eq(scenesTable.projectId, projectId),
        eq(scenesTable.userId, userId),
      ),
    );

  if (!project || !scene) {
    res.status(404).json({ error: "Scene not found" });
    return;
  }

  try {
    const raw = await askGemini(`Analyze this scene and propose an initial shot list.

SCENE:
${sceneText}

AVAILABLE RESOURCES:
Budget: ${budget || "Not stated; flag cost assumptions."}
Equipment already available: ${equipment || "Not stated; do not assume specialty gear is available."}
Crew experience: ${crewExperience || "Not stated; use conservative setup estimates."}
Other constraints: ${resources || "None stated."}

PREVIOUS CONVERSATION:
${formatHistory(history)}

${modeInstruction(challengeMode)}

PROJECT FORMAT: ${project.projectType}
For an AI-generated project, use sourceType "ai-generated" and populate compute/generation cost,
model or tool choice, prompt iteration time, cross-shot consistency strategy, and upscaling/post
needs; equipment and crew may be empty. For live-action, use sourceType "practical". For hybrid,
music-video, or documentary work, choose sourceType per shot and populate only the relevant
production fields while keeping framing, lens, movement, intent, and pacing coherent across both.
For every shot, add one or two concise referenceExamples drawn from real films, documentaries, or
music videos. Describe only the comparable technique in your own words; do not quote scripts,
books, interviews, or criticism, and set every reference URL to null. ShotWise attaches its own
verified free learning links after generation.

Start with the scene's central dramatic intent in your message. Propose 3 to 6 shots.
Rate every shot against this exact resource profile, use honest setup-time ranges, and give
a cheaper/simpler alternative with its creative trade-off whenever a shot exceeds the profile.
Set readyToLock to false until the director has had a chance to respond.`);
    const plan = prepareAnalysisPlan(raw, scene.shots);
    const [updatedScene] = await db
      .update(scenesTable)
      .set({
        sceneText,
        resources,
        budget,
        equipment,
        crewExperience,
        challengeMode,
        messages: [{ role: "assistant", content: plan.message }],
        shots: plan.shots,
        readyToLock: plan.readyToLock,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(scenesTable.id, sceneId),
          eq(scenesTable.projectId, projectId),
          eq(scenesTable.userId, userId),
        ),
      )
      .returning();

    if (!updatedScene) {
      res.status(404).json({ error: "Scene not found" });
      return;
    }

    await db
      .update(projectsTable)
      .set({ updatedAt: new Date() })
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));

    const result = AnalyzeSceneResponse.parse({
      projectId,
      sceneId,
      ...plan,
    });
    res.json(result);
  } catch (error) {
    req.log.error({ err: error }, "Gemini scene analysis failed");
    res.status(500).json({ error: "ShotWise could not analyze this scene right now." });
  }
});

router.post("/gemini/respond/stream", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const parsed = StreamDirectorResponseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please provide a valid director message." });
    return;
  }

  const { projectId, sceneId, message } = parsed.data;
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(
      and(
        eq(projectsTable.id, projectId),
        eq(projectsTable.userId, userId),
      ),
    );

  const [scene] = await db.select().from(scenesTable).where(and(eq(scenesTable.id, sceneId), eq(scenesTable.projectId, projectId), eq(scenesTable.userId, userId)));
  if (!project || !scene) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const challengeMode = parsed.data.challengeMode ?? false;
  const resources = parsed.data.resources ?? scene.resources;
  const budget = parsed.data.budget ?? scene.budget;
  const equipment = parsed.data.equipment ?? scene.equipment;
  const crewExperience = parsed.data.crewExperience ?? scene.crewExperience;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const raw = await streamGemini(`Continue the directing conversation. Respond to the director's latest message,
revise the shot list when their note changes the plan, and push back when their suggestion would
undermine the story intent or exceed the resources. If they ask to lock/finalize and the list is
coherent, set readyToLock to true.

SCENE:
${scene.sceneText.slice(0, 5000)}

AVAILABLE RESOURCES:
Budget: ${budget || "Not stated; flag cost assumptions."}
Equipment already available: ${equipment || "Not stated; do not assume specialty gear is available."}
Crew experience: ${crewExperience || "Not stated; use conservative setup estimates."}
Other constraints: ${resources || "None stated."}

CURRENT SHOT LIST (compact context):
${formatRevisionShots(scene.shots)}

RECENT CONVERSATION:
${formatRevisionHistory(scene.messages)}

PROJECT FORMAT: ${project.projectType}. Keep practical and AI-generated shots clearly flagged and
populate the production fields relevant to each source type.
Preserve or improve each shot's referenceExamples. Use real works, describe only the relevant
technique in original language, include no copyrighted excerpts, and set reference URLs to null.

${modeInstruction(challengeMode)}

LATEST DIRECTOR MESSAGE:
DIRECTOR: ${message}

Keep every shot field populated. Preserve shots that still serve the scene, and use stable ids
like shot-1, shot-2 for retained shots. Rate every shot against the resource profile above.
Preserve every non-null setupTimeOverride exactly and use it as the authoritative planning time.
Return the full updated list, not only changed shots.`,
      (text) => {
        res.write(`data: ${JSON.stringify({ type: "delta", text })}\n\n`);
      },
    );
    const parsedPlan = parsePlan(raw);
    const plan = {
      ...parsedPlan,
      shots: preserveSetupTimeOverrides(parsedPlan.shots, scene.shots),
    };
    const nextMessages = [
      ...scene.messages,
      { role: "director" as const, content: message },
      { role: "assistant" as const, content: plan.message },
    ];
    const [updated] = await db
      .update(scenesTable)
      .set({
        messages: nextMessages,
        shots: plan.shots,
        resources,
        budget,
        equipment,
        crewExperience,
        readyToLock: plan.readyToLock,
        locked: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(scenesTable.id, sceneId),
          eq(scenesTable.userId, userId),
        ),
      )
      .returning();

    res.write(
      `data: ${JSON.stringify({
        type: "complete",
        project: {
          ...updated,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      })}\n\n`,
    );
    res.end();
  } catch (error) {
    req.log.error({ err: error }, "Gemini director response failed");
    res.write(
      `data: ${JSON.stringify({
        type: "error",
        message: "ShotWise could not respond right now.",
      })}\n\n`,
    );
    res.end();
  }
});

export default router;
