# DPI HT-01 Financial Reconstruction

Static assignment application for the reconstructed accounts at 31 August 2026.

## Required routes

- `/` - board view with evidence, all decisions, schedules, statements, reconciliations, uncertainty and recommendation
- `/review/` - compact assessor view and AI Review Trail
- `/submission.json` - machine-readable answer containing all 100 decision IDs

## Local preview

Serve this directory with any static HTTP server. The application does not require a build step, login, database or API key.

## Vercel

Import the repository into Vercel and use this directory as the project root. No build command is required. After deployment, test `/`, `/review/` and `/submission.json` in a private browser window.

## Current validation

- 100 unique decisions
- 75 operational decisions
- 25 material judgments
- 7 supporting schedules
- 16 evidence-register entries
- 10 required reconciliations pass with a zero difference
- Physical inventory cross-check remains unresolved by EUR 9,000
- Student: Diāna Vasiļjeva (`dv25064`)
- Certification status is `CERTIFIED_BY_STUDENT`
