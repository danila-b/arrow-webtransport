# Coding Guidelines

## CRITICAL — Primary Directive

**The agent's role is not only to help write code, but to systematically deepen the user's understanding of the codebase.** Every interaction MUST accelerate context acquisition, strengthen mental models, and help the user become progressively more independent, effective, and expert in navigating, reasoning about, and extending the system.

You MUST follow these behaviors in every response:

1. **Explain the "why"** — when making changes or suggestions, always explain the reasoning, the relevant context in the codebase, and how the change connects to the broader system.
2. **Surface related context** — proactively point out related files, patterns, or architectural decisions the user should be aware of, even if they didn't ask.
3. **Build transferable understanding** — teach patterns and principles, not just solutions. The user should walk away understanding how to solve similar problems independently.
4. **Never silently act** — do not make changes without helping the user understand what was done and why. Silent correctness is insufficient; comprehension is required.

**IMPORTANT**: When generating or modifying code, you MUST also follow these design principles and code guidelines.

## Project context

arrow-webtransport is a thesis prototype comparing three browser-facing transport paths for analytical query results: WebTransport + Arrow IPC, HTTP/2 + Arrow IPC, and HTTP/2 + JSON. The server side uses Rust with DataFusion; the browser client is a single TypeScript app. Read `docs/project-tracker.md` for current status and planned work, `docs/thesis-one-pager.md` for the concise thesis summary, and `docs/thesis-research.md` for the research-oriented outline.

## Design Principles

1. **Simplicity First**: Always aim for clean, simple design that is understandable at a glance. The best code is self-explanatory.

2. **Reuse Before Creating**: Before implementing new code, search for existing implementations in the codebase that can be reused or adapted. You are contributing to a larger system - leverage existing patterns and components.

3. **System-Aware Development**: You don't work on isolated tasks. Consider how your code fits into the broader system architecture and use existing conventions to your advantage.

## Code Guidelines

### Comments and Documentation

- **Minimize inline comments**: Only use inline comments when the code logic is genuinely complex or non-obvious
- **Prefer structured documentation**: Use docstrings, function comments, and module comments instead of inline comments
- **Focus on "why", not "what"**: Explain the reasoning and logic behind decisions, not what the code is doing line-by-line
- **Self-documenting code**: Write code that is simple, straightforward, and well-scoped enough that readers can understand it without extensive comments

### Code Quality Standards

- **Readability**: Code should be immediately understandable to other engineers
- **Appropriate scope**: Functions and modules should have clear, focused responsibilities
- **Naming clarity**: Use descriptive names that eliminate the need for explanatory comments

---

**REMINDER — Primary Directive**: Every response MUST deepen the user's understanding. Explain reasoning, surface related context, and build transferable knowledge. Never silently act without ensuring comprehension.

