---
name: Gemini model availability
description: Google API key model availability can differ from the model catalog used during setup.
---

When a newly provisioned Google Gemini API key rejects an older model with a NOT_FOUND response, follow the current model ID explicitly named in Google’s response rather than retrying the retired model.

**Why:** New-user access can be restricted to newer model IDs even when older models appear in generic SDK examples.

**How to apply:** Keep the model choice centralized in the server integration so it can be updated without changing client contracts.