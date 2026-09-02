---
name: Orval integer schemas
description: The generated Zod client can target a different Zod major version than the workspace runtime.
---

Avoid OpenAPI integer fields when the installed Orval output targets Zod 3 and emits zod.int(); use a numeric schema when integer validation is not essential to the API boundary.

**Why:** The generated code failed typechecking because Zod 3 does not expose zod.int(), while the rest of the workspace expects the generated files to typecheck.

**How to apply:** If integer semantics are required, verify the generator and Zod versions together before adding integer schemas to the shared contract.