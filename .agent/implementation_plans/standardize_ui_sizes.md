# Standardization of UI Sizes and Linting Fixes

## Problem
The current codebase has some inconsistencies in UI sizing types (specifically `AvatarSize` using a hardcoded `"2xl"` value instead of a standard size from `ComponentSize`) and linting/formatting errors in `src/index.css` and `src/lib/types/ui.ts`.

## Solution
We will standardize the `ComponentSize` type to include `xxl`, update all relevant files to use this new size, and fix the formatting issues.

## Proposed Changes

### 1. Update `src/lib/types/ui.ts`
- Add `xxl` to the `ComponentSize` type definition.

### 2. Update `src/index.css`
- Rename `--size-avatar-2xl` to `--size-avatar-xxl` for consistency.
- Fix indentation issues (use tabs/spaces consistently as per project settings).

### 3. Update `src/components/ui/Avatar/avatar.module.css`
- Ensure the class for the largest size matches the new type (already `.xxl`, just verify standard variable usage).

### 4. Update `src/components/ui/Avatar/index.tsx`
- Simplified `AvatarSize` to just be `ComponentSize`.
- Update `sizeMapping` to use `xxl` instead of `"2xl"`.
- Verify standard `fallback` typing compliance with Radix.

### 5. Verify & Fix Formatting
- Run `npm run format` to automatically fix indentation and formatting issues across the project.
- Run `npm run lint` and `npm run typecheck` to ensure no regressions.

## Verification Plan
1.  **Manual Verification**: Check `Avatar` component usage in `ContactsPage` (where "2xl" was used) to ensure it still looks correct (now using `xxl`).
2.  **Automated Checks**:
    - `npm run format` (should pass or fix files)
    - `npm run lint` (should pass)
    - `npx tsc --noEmit` (should pass)
