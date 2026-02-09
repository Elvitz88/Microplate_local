   

from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

from app.config import Config

logger = logging.getLogger(__name__)

MIN_LINE_SPACING = 1e-4


class CalibrationService:
       

    def __init__(self, config_path: Optional[str] = None):
        path = config_path or getattr(Config, "CALIBRATION_CONFIG_PATH", "config/roi_calibration.json")
        self.config_path = Path(path)
        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        self.rows = int(getattr(Config, "GRID_ROWS", 8))
        self.cols = int(getattr(Config, "GRID_COLS", 12))
        self._config: Optional[Dict] = None
        self._config_format_version = 3                                        
        self._load()

    def _load(self) -> None:
        if not self.config_path.exists():
            logger.info("Calibration config not found at %s", self.config_path)
            self._config = None
            return
        try:
            data = json.loads(self.config_path.read_text(encoding="utf-8"))
            if not all(key in data for key in ("bounds", "columns", "rows")):
                logger.warning("Calibration config is in an old format. Clearing and requiring recalibration.")
                self._config = None
                return
            
                                                         
            format_version = data.get("format_version", 2)
            logger.info("Loaded calibration config format_version=%s", format_version)
            
                                                                       
            if format_version < 3:
                logger.warning("Old calibration format (v%s), please recalibrate", format_version)
                self._config = None
                return
            
            self._config = data
            logger.info("Loaded calibration config (updated_at=%s)", self._config.get("updated_at"))
        except Exception as exc:
            logger.error("Failed to read calibration config: %s", exc)
            self._config = None

    def get_config(self) -> Optional[Dict]:
        return self._config

    def clear(self) -> None:
        if self.config_path.exists():
            try:
                self.config_path.unlink()
            except OSError as exc:
                logger.warning("Unable to delete calibration config: %s", exc)
        self._config = None
        logger.info("Calibration config cleared")

    def save(
        self,
        image_width: int,
        image_height: int,
        bounds: Optional[Dict[str, float]] = None,
        columns: Optional[List[float]] = None,
        rows: Optional[List[float]] = None,
    ) -> Dict:
        if image_width <= 0 or image_height <= 0:
            raise ValueError("Image dimensions must be positive")

                                            
        logger.info("=== Save Calibration Debug ===")
        logger.info(f"Received - Image size: {image_width}x{image_height}")
        logger.info(f"Received - Bounds (pixel): {bounds}")
        logger.info(f"Received - Columns (pixel): {columns}")
        logger.info(f"Received - Rows (pixel): {rows}")

                                              
        config = {
            "bounds": bounds or {"left": 0, "right": image_width, "top": 0, "bottom": image_height},
            "columns": columns or list(range(0, image_width + 1, image_width // self.cols)),
            "rows": rows or list(range(0, image_height + 1, image_height // self.rows)),
            "image_width": image_width,
            "image_height": image_height,
            "updated_at": datetime.utcnow().isoformat() + "Z",
            "format_version": 3,                                            
        }

        logger.info(f"Saved bounds (pixel): {config['bounds']}")
        logger.info(f"Saved columns[0:3] (pixel): {config['columns'][0:3]}")
        logger.info(f"Saved rows[0:3] (pixel): {config['rows'][0:3]}")

        self.config_path.write_text(json.dumps(config, indent=2), encoding="utf-8")
        self._config = config                       
        logger.info("Calibration config saved to %s", self.config_path)
        return config

    def get_grid(self, frame_shape: Tuple[int, int]) -> Dict[str, List[float]]:
        height, width = frame_shape
        if width <= 0 or height <= 0:
            raise ValueError("Frame size must be positive")

                                                           
        self._load()
        
        config = self._config or {}
        format_version = config.get("format_version", 2)
        
        bounds = config.get("bounds")
        columns = config.get("columns")
        rows = config.get("rows")

        if not bounds or not columns or not rows:
            logger.info("No calibration config found, using default grid")
            return self._generate_default_grid(width, height)

                                                            
        if format_version == 3:
            logger.info("=== get_grid Debug (v3: pixel format) ===")
            logger.info(f"Frame size: {width}x{height}")
            logger.info(f"Bounds (pixel): {bounds}")
            logger.info(f"Columns[0:3] (pixel): {columns[0:3]}")
            logger.info(f"Rows[0:3] (pixel): {rows[0:3]}")

            stored_width = float(config.get("image_width") or 0) or None
            stored_height = float(config.get("image_height") or 0) or None

            if stored_width and stored_height and (
                stored_width != width or stored_height != height
            ):
                scale_x = width / stored_width
                scale_y = height / stored_height
                logger.info(
                    "Scaling calibration from %sx%s to %sx%s (scale_x=%.4f, scale_y=%.4f)",
                    stored_width,
                    stored_height,
                    width,
                    height,
                    scale_x,
                    scale_y,
                )

                scaled_bounds = {
                    "left": bounds.get("left", 0.0) * scale_x,
                    "right": bounds.get("right", stored_width) * scale_x,
                    "top": bounds.get("top", 0.0) * scale_y,
                    "bottom": bounds.get("bottom", stored_height) * scale_y,
                }
                scaled_columns = [value * scale_x for value in columns]
                scaled_rows = [value * scale_y for value in rows]
            else:
                scaled_bounds = bounds
                scaled_columns = columns
                scaled_rows = rows

            return {
                "bounds": scaled_bounds,
                "columns": scaled_columns,
                "rows": scaled_rows,
            }
        
                                                               
        logger.info("=== get_grid Debug (v2: normalized format) ===")
        left = float(np.clip(bounds.get("left", 0.0), 0.0, 1.0)) * width
        right = float(np.clip(bounds.get("right", 1.0), 0.0, 1.0)) * width
        top = float(np.clip(bounds.get("top", 0.0), 0.0, 1.0)) * height
        bottom = float(np.clip(bounds.get("bottom", 1.0), 0.0, 1.0)) * height

        width_span = max(right - left, 1.0)
        height_span = max(bottom - top, 1.0)

        columns_pixel = [left + float(np.clip(value, 0.0, 1.0)) * width_span for value in columns]
        rows_pixel = [top + float(np.clip(value, 0.0, 1.0)) * height_span for value in rows]

        logger.info(f"Frame size: {width}x{height}")
        logger.info(f"Columns[0:3] (pixel): {[f'{c:.1f}' for c in columns_pixel[0:3]]}")
        logger.info(f"Rows[0:3] (pixel): {[f'{r:.1f}' for r in rows_pixel[0:3]]}")

        return {
            "bounds": {"left": left, "right": right, "top": top, "bottom": bottom},
            "columns": columns_pixel,
            "rows": rows_pixel,
        }

    def _default_columns(self) -> List[float]:
        return [i / float(self.cols) for i in range(self.cols + 1)]

    def _default_rows(self) -> List[float]:
        return [i / float(self.rows) for i in range(self.rows + 1)]

    def _default_bounds(self) -> Dict[str, float]:
        return {"left": 0.0, "right": 1.0, "top": 0.0, "bottom": 1.0}

    def _generate_default_grid(self, width: float, height: float) -> Dict[str, List[float]]:
        left = 0.0
        right = width
        top = 0.0
        bottom = height
        width_span = max(right - left, 1.0)
        height_span = max(bottom - top, 1.0)
        columns = [left + value * width_span for value in self._default_columns()]
        rows = [top + value * height_span for value in self._default_rows()]
        return {
            "bounds": {"left": left, "right": right, "top": top, "bottom": bottom},
            "columns": columns,
            "rows": rows,
        }

                                                                                
                                                 


    @staticmethod
    def _corner_points_from_normals(normalized_lines: Dict[str, List[float]]) -> List[Dict[str, float]]:
        vertical = normalized_lines.get("vertical", [])
        horizontal = normalized_lines.get("horizontal", [])

        if len(vertical) < 2 or len(horizontal) < 2:
            return [
                {"x": 0.0, "y": 0.0},
                {"x": 1.0, "y": 0.0},
                {"x": 1.0, "y": 1.0},
                {"x": 0.0, "y": 1.0},
            ]

        return [
            {"x": vertical[0], "y": horizontal[0]},
            {"x": vertical[-1], "y": horizontal[0]},
            {"x": vertical[-1], "y": horizontal[-1]},
            {"x": vertical[0], "y": horizontal[-1]},
        ]

