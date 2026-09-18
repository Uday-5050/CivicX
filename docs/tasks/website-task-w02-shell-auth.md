# Website task W02 — shared shell and authentication corrections

**Date:** 18 September 2026  
**Scope:** website client only. No backend contract, production data, push, or deployment changes.

## Deliverable

W02 adds the shared workspace shell and corrects the authentication/onboarding boundaries identified in W01.

### Shared shell

- `client/src/components/Layout/Brand.tsx` owns the CivicX brand markup.
- `client/src/components/Layout/WorkspaceHeader.tsx` provides role-aware navigation for citizen, university, industry, and admin accounts.
- `client/src/components/Layout/RoleMismatch.tsx` gives a safe destination when a signed-in account opens another role's workspace.
- `client/src/components/Layout/Layout.css` contains responsive navigation and boundary-state styles.
- Existing `components/States`, `StatusPill`, and global button styles remain the reusable loading, error, empty, status, and action primitives for feature tasks.
- Existing feature pages now use the shared header, so sign-out and workspace navigation behave consistently.

### Authentication and onboarding

- Login now has explicit Citizen, University, and Industry choices. The client no longer treats every institutional account as a university account.
- The auth context requires the selected role to match the API user role exactly.
- Institutional registration sends either `institutionType: university` or `institutionType: industry` through the existing onboarding endpoint.
- Pending university and industry accounts render a truthful review state and do not load protected institution screens while approval is pending.
- Legacy government navigation now lands on a clear admin-workspace explanation instead of calling unsupported `/government/*` endpoints.
- Saved legacy users with an unsupported role are ignored during session restore.
- Direct bookmarked protected routes attempt one refresh-token restore before redirecting, so browser refresh and deep links preserve authenticated sessions when the server session is valid.
- Existing password visibility controls remain available on login, registration, institution onboarding, and reset-password forms.

## Files changed

- `client/src/App.tsx`
- `client/src/App.css`
- `client/src/constants/roles.ts`
- `client/src/features/auth/AuthContext.tsx`
- `client/src/components/Layout/Brand.tsx`
- `client/src/components/Layout/WorkspaceHeader.tsx`
- `client/src/components/Layout/RoleMismatch.tsx`
- `client/src/components/Layout/Layout.css`

## Acceptance evidence

- [x] `npm run build` passes (`tsc -b` and Vite production build).
- [x] `npm test -- --run` passes: 2 test files, 4 tests.
- [x] `npm run lint` completes with existing non-blocking warnings only; no new lint error was introduced.
- [x] `git diff --check` passes.
- [x] No backend files or API payloads were changed for W02.
- [x] Wrong-role pages have a safe return path rather than silently loading another role's data.
- [x] Pending institutional onboarding is visible and does not attempt institution API calls.
- [ ] Manual browser screenshots at 360/768/1440 pixels remain part of W13 visual regression.
- [ ] Full browser role-flow acceptance remains part of W14.

## Remaining W02 follow-up

The next feature task is W03: replace legacy university/industry/admin client wrappers with typed wrappers for the already implemented lifecycle contracts. W02 intentionally does not migrate those feature endpoints.
