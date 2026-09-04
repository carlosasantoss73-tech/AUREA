# Conchita Mergeability Preflight V1

## Purpose
Prevent stacked Conchita cells from accumulating unresolved integration risk.

## Gate
Before opening or extending a dependent PR:
1. verify the base branch exists and is the intended integration point;
2. compare base/head and inspect changed files;
3. verify required CI workflow triggers cover the PR target;
4. run exact-head CI when available;
5. do not interpret `merge_commit_sha` as proof of merge;
6. do not proceed to a dependent production gate while the integration gate is unresolved.

## Current finding
PR #60 is open and its API snapshot reports `mergeable: false`; this is treated as an integration defect to diagnose, not as permission to continue stacking blindly.

## Learning
Speed comes from parallel work on independent fronts, not from ignoring dependency health. Every dependent cell must have a verified base.
