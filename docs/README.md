# Documentation

This folder contains project documentation and archived reference material that
does not belong in the active application source tree.

## Structure

- `README.md`: overview of the docs folder and archive policy.
- `archive/files/`: deprecated standalone files retained for historical
  reference.

## Archive Policy

Files in `docs/archive/files/` are not active runtime inputs for the React app,
the Vite build, or the current TypeScript test suite. Keep archived files here
when they are useful for historical comparison, migration reference, or
recovering old implementation details.

Current archived files:

- `forecast.py`: deprecated Python forecast implementation.
- `forecast_v1.0-alpha.py`: deprecated alpha Python forecast implementation.
- `requirements.txt`: deprecated Python dependency list for the archived
  forecast scripts.

Do not restore deprecated files to the repository root unless they are being
reactivated as maintained project files. If a deprecated root file reappears,
move it to `docs/archive/files/` and document why it is retained.

Active application source remains in the repository root configuration files,
`src/`, `public/`, `scripts/`, and `tests/`.
