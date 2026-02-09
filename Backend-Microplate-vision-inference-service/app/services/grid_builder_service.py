   

from __future__ import annotations

import logging
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np

from app.config import Config
from app.services.calibration_service import CalibrationService

logger = logging.getLogger(__name__)


class GridBuilder:
       

    def __init__(self, rows: int = 8, cols: int = 12, calibration_service: Optional[CalibrationService] = None):
        self.rows = rows
        self.cols = cols
        self.calibration_service = calibration_service or CalibrationService()
        self.default_width = Config.DEFAULT_GRID_WIDTH
        self.default_height = Config.DEFAULT_GRID_HEIGHT
        self._calibration_override: Optional[Dict] = None

    def set_calibration_override(self, calibration_config: Optional[Dict]) -> None:
        """Set calibration config override (used when receiving calibration via job message)"""
        self._calibration_override = calibration_config
        if calibration_config:
            logger.info("Calibration override set from job message")

    @staticmethod
    def _create_row_labels(rows: int) -> List[str]:
        alphabet = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
        if rows <= len(alphabet):
            return alphabet[:rows]

        labels: List[str] = []
        index = 0
        while len(labels) < rows:
            prefix = alphabet[index // len(alphabet) - 1] if index >= len(alphabet) else ""
            labels.append(prefix + alphabet[index % len(alphabet)])
            index += 1
        return labels

    def draw(self, image: np.ndarray) -> Tuple[np.ndarray, List[Dict], Dict]:
           
        original_h, original_w = image.shape[:2]
        metadata: Dict[str, Optional[object]] = {
            "original_size": (original_w, original_h),
            "bounds": None,
        }

        # Use calibration override if available (from job message), otherwise use service
        if self._calibration_override:
            logger.info("Using calibration override from job message")
            grid_definition = self._get_grid_from_override((original_h, original_w))
        else:
            grid_definition = self.calibration_service.get_grid((original_h, original_w))
        
        logger.info("Grid definition from calibration: columns=%d, rows=%d", 
                    len(grid_definition.get("columns", [])), 
                    len(grid_definition.get("rows", [])))
        logger.debug("Grid columns: %s", grid_definition.get("columns", [])[:5])
        logger.debug("Grid rows: %s", grid_definition.get("rows", [])[:5])
        metadata.update(grid_definition)

        grid_image = image.copy()
        wells = self._build_grid(
            grid_image,
            grid_definition.get("columns", []),
            grid_definition.get("rows", []),
        )
        return grid_image, wells, metadata

    def _build_grid(
        self,
        image: np.ndarray,
        vertical_lines: List[float],
        horizontal_lines: List[float],
    ) -> List[Dict]:
        height, width = image.shape[:2]

        if len(vertical_lines) != self.cols + 1:
            vertical_lines = np.linspace(0, width, self.cols + 1, dtype=float).tolist()
        if len(horizontal_lines) != self.rows + 1:
            horizontal_lines = np.linspace(0, height, self.rows + 1, dtype=float).tolist()

        labels = self._create_row_labels(self.rows)
        wells: List[Dict] = []

        for row_index in range(self.rows):
            for col_index in range(self.cols):
                x1 = int(round(vertical_lines[col_index]))
                y1 = int(round(horizontal_lines[row_index]))
                x2 = int(round(vertical_lines[col_index + 1]))
                y2 = int(round(horizontal_lines[row_index + 1]))
                label = f"{labels[row_index]}{col_index + 1}"

                cv2.rectangle(image, (x1, y1), (x2, y2), (0, 0, 255), 2)
                cv2.putText(
                    image,
                    label,
                    (x1 + 10, y1 + 35),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.75,
                    (255, 0, 0),
                    2,
                )

                wells.append(
                    {
                        "label": label,
                        "top_left": (x1, y1),
                        "bottom_right": (x2, y2),
                        "predictions": [],
                    }
                )

        logger.info("Grid drawn on normalized image %sx%s", width, height)
        return wells

    def _get_grid_from_override(self, frame_shape: Tuple[int, int]) -> Dict[str, List[float]]:
        """Get grid from calibration override config"""
        height, width = frame_shape
        config = self._calibration_override or {}
        
        bounds = config.get("bounds")
        columns = config.get("columns")
        rows = config.get("rows")
        
        if not bounds or not columns or not rows:
            logger.info("Calibration override incomplete, using default grid")
            return self._generate_default_grid(width, height)
        
        # Format version 3 uses pixel values directly
        format_version = config.get("format_version", 3)
        if format_version >= 3:
            stored_width = float(config.get("image_width") or 0) or None
            stored_height = float(config.get("image_height") or 0) or None
            
            if stored_width and stored_height and (stored_width != width or stored_height != height):
                scale_x = width / stored_width
                scale_y = height / stored_height
                logger.info("Scaling calibration from %sx%s to %sx%s", stored_width, stored_height, width, height)
                
                scaled_bounds = {
                    "left": bounds.get("left", 0.0) * scale_x,
                    "right": bounds.get("right", stored_width) * scale_x,
                    "top": bounds.get("top", 0.0) * scale_y,
                    "bottom": bounds.get("bottom", stored_height) * scale_y,
                }
                scaled_columns = [v * scale_x for v in columns]
                scaled_rows = [v * scale_y for v in rows]
                return {"bounds": scaled_bounds, "columns": scaled_columns, "rows": scaled_rows}
            
            return {"bounds": bounds, "columns": columns, "rows": rows}
        
        # Fallback for older formats
        return self._generate_default_grid(width, height)

    def _generate_default_grid(self, width: float, height: float) -> Dict[str, List[float]]:
        """Generate default grid when no calibration is available"""
        columns = [i * width / self.cols for i in range(self.cols + 1)]
        rows = [i * height / self.rows for i in range(self.rows + 1)]
        return {
            "bounds": {"left": 0.0, "right": width, "top": 0.0, "bottom": height},
            "columns": columns,
            "rows": rows,
        }

    def restore_original(
        self,
        annotated_image: np.ndarray,
        wells: List[Dict],
        metadata: Dict,
        original_image: np.ndarray,
    ) -> Tuple[np.ndarray, List[Dict]]:
           
        return annotated_image, wells
