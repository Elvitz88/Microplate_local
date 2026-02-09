## Manual grid adjustment requirements (2025-11-14)

- Calibration UI needs draggable handles on image to adjust each vertical/horizontal grid line (total 12 columns, 8 rows + borders).
- Enforce ordering constraints to prevent line crossing.
- Provide live preview and persist per-line positions to backend calibration config.
- Backend must store normalized positions for 13 vertical and 9 horizontal lines.
- Migration: fallback to evenly spaced lines when old config without `line_positions` is loaded.


