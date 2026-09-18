# Changelog

## 0.0.5

### Patch Changes

- Fix the Convex directory badge image URL, which still pointed at `badge/sholajegede/convex-vapi` after the link URL was corrected in a previous release; both now use the plain `badge/convex-vapi` path.

## 0.0.4

### Patch Changes

- Drop the username scope from the Convex directory badge link in README, matching the directory's updated URL format

## 0.0.3

### Patch Changes

Fix `createCall` and `refreshCall` being typed as `ctx: GenericActionCtx<GenericDataModel>`, which only type-checks when the calling app's schema is empty. Any real app with its own tables got a compile error on both calls. They now accept a minimal structural ctx type instead, matching the pattern the query methods already used. The example app's schema was also given a real table, so this class of bug shows up in this repo's own typecheck from now on instead of only in a downstream app.

## 0.0.2

### Patch Changes

- Add demo screenshot to README

## 0.0.1

— status-regression fix, dashboard queries, and a redesigned example app

## 0.0.0

- Initial release.
