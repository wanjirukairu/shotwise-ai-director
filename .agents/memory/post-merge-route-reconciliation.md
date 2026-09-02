---
name: Post-merge route reconciliation
description: Why successful dependency/database setup is not enough to validate merged API route changes.
---

After an isolated task merge touches API route regions that also changed on the main branch, inspect and compile the merged routes even when the post-merge setup script itself succeeds.

**Why:** Textual reconciliation can leave duplicated or interleaved handlers that look superficially valid but fail compilation or change endpoint behavior.

**How to apply:** After post-merge setup, confirm affected services typecheck and build before treating workflow reconciliation as complete.