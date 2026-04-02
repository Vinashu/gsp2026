# AI Skill And Agent Pack

This folder provides two layers:

- `skills/`: reusable domain instructions that stay vendor-neutral
- `agents/`: provider-specific agent definitions for GPT and Claude

Domains included:

- JavaScript
- Node.js
- Bun.js
- Scientific research
- Bioinformatics
- Algorithm development
- Algorithm optimization

Recommended usage:

1. Pick the domain skill from `ai/skills/<domain>/SKILL.md`.
2. Pair it with the provider-specific agent definition from `ai/agents/gpt/` or `ai/agents/claude/`.
3. Use the skill as the reusable operating guide and the agent file as the system prompt or agent profile.

Design notes:

- Skills are concise and reusable across tools and runtimes.
- GPT agent definitions use a direct markdown-style operating contract.
- Claude agent definitions use XML-style sections that work well with Anthropic system prompts.
- The research and bioinformatics profiles emphasize traceability, reproducibility, and explicit uncertainty.
