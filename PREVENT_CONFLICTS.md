# Merge Conflict Prevention Strategy

## Executive Summary
This document outlines strategies to minimize merge conflicts and improve developer velocity in the `jules-ink` codebase, specifically targeting parallel development by agentic workflows. The primary goal is to decouple components and enforce stricter boundaries to allow multiple agents to work simultaneously without stepping on each other's toes.

## Analysis

### 1. Barrel Files (`src/index.ts`)
The existence of `src/index.ts` re-exporting all modules creates a high contention point. Any time a new module is added, renamed, or a function signature changes, this file must be modified. This centralization is a major source of merge conflicts in active codebases.

### 2. Large Files with Mixed Concerns
Several files have grown to encompass multiple distinct responsibilities. This increases the likelihood that two unrelated tasks will require changes to the same file.

*   **`src/label-generator.ts`**: This file currently handles:
    *   Asset resolution (fonts, images).
    *   Canvas context management.
    *   Layout calculation constants and logic.
    *   Text wrapping (partially).
    *   Rendering commands.
    *   **Recommendation:** Split into `src/label/assets.ts`, `src/label/layout.ts`, and `src/label/renderer.ts`.

*   **`src/server.ts`**: Currently handles:
    *   HTTP routing (Hono).
    *   AI Integration (Google GenAI).
    *   Printing orchestration.
    *   **Recommendation:** Extract AI logic to `src/services/ai.ts` and printing logic to `src/services/printer.ts`. Keep `server.ts` strictly for routing and request handling.

*   **`src/summarizer.ts`**: This is a complex file handling:
    *   AI Client management (Google/Ollama).
    *   Prompt template generation.
    *   Session state management.
    *   Diff parsing and filtering (duplicating logic from `src/analyzer.ts`).
    *   **Recommendation:** Extract prompts to `src/prompts.ts`, create a unified `AIProvider` interface, and reuse `src/analyzer.ts` for all diff parsing.

### 3. Shared Utility Files (`src/utils.ts`)
`src/utils.ts` contains text wrapping logic specific to the label generator (`calculateWrappedLines`, `calculateWrappedSegments`). Modifications to this specific logic force changes to a shared generic file, increasing conflict risk with other utilities.

### 4. Type Definitions
While `src/types.ts` exists, many types are defined inline or within specific modules.
*   **Problem:** Inline types in `src/server.ts` (e.g., for API requests) make it hard to validate payloads and share types between client and server.
*   **Problem:** `src/print.ts` exports types that are used by the server, creating a dependency.

## Action Items

### A. Eliminate Barrel Files
*   **Action:** Deprecate `src/index.ts`.
*   **Implementation:** Remove `src/index.ts` and refactor all imports to point directly to the source files (e.g., `import { generateLabel } from './label-generator.js'`). This eliminates the central bottleneck.

### B. Modularize Label Generation
*   **Action:** Refactor `src/label-generator.ts` into a directory `src/label/`.
*   **Files:**
    *   `src/label/assets.ts`: Font registration and image loading.
    *   `src/label/layout.ts`: `CONFIG` object and layout calculations.
    *   `src/label/text.ts`: Move `calculateWrappedSegments` and related logic here from `src/utils.ts`.
    *   `src/label/index.ts`: (Optional) Only if needed for a clean public API, but prefer direct imports.

### C. Decouple Server Logic
*   **Action:** Extract business logic from `src/server.ts`.
*   **Files:**
    *   `src/services/ai.ts`: encapsulate `GoogleGenAI` interaction.
    *   `src/services/printer.ts`: encapsulate `thermal` printing logic.
    *   `src/server.ts`: Should only contain Hono route definitions and call these services.

### D. Unify Diff Parsing
*   **Action:** Centralize diff parsing logic.
*   **Implementation:** `src/summarizer.ts` and `src/analyzer.ts` both use `parse-diff` and `micromatch`.
    *   Move all diff parsing, filtering, and token counting logic to `src/analyzer.ts`.
    *   `src/summarizer.ts` should import these functions instead of re-implementing them.

### E. Enforce Explicit Typing
*   **Action:** Create a `src/api-types.ts` (or add to `src/types.ts`).
*   **Implementation:** Define strict interfaces for all API request bodies (e.g., `GenerateRequest`, `PrintRequest`) and responses. Use these interfaces in `src/server.ts` to type-check `c.req.json()`.

### F. Testing Strategy
*   **Action:** Ensure strict 1:1 mapping between source files and test files.
*   **Implementation:**
    *   `src/label/text.ts` -> `tests/unit/label/text.test.ts`
    *   `src/analyzer.ts` -> `tests/unit/analyzer.test.ts`
    *   This ensures that changes to a specific module only require running/updating the relevant test file, reducing test suite conflicts.
