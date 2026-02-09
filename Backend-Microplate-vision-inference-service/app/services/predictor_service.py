                                    
import os
import glob
import cv2
from ultralytics import YOLO
import logging

                 
logger = logging.getLogger(__name__)

                        
COLORS = {0: (255, 0, 0), 1: (0, 255, 0), 2: (0, 0, 255)}

class Predictor:
       
    def __init__(self, model_path, confidence_threshold=0.5, device=None):
        weights_path = self._resolve_weights_path(model_path)
        logger.info(f"Loading YOLO weights from: {weights_path}")
        self.model = YOLO(weights_path)
        # Device handling:
        # - If device is None, allow Ultralytics to auto-select (GPU if available).
        # - If device is provided (e.g., 'cpu', '0'), forward it to predict().
        # NOTE: forcing CPU here (as the previous version did) can also hide GPU availability.
        self.device = device if device is not None else os.getenv("YOLO_DEVICE", None)
        if self.device in ("cpu", "CPU"):
            self.model.to("cpu")
        self.confidence_threshold = confidence_threshold

    @staticmethod
    def _resolve_weights_path(model_path: str) -> str:
           
        if os.path.isdir(model_path):
            candidates = sorted(glob.glob(os.path.join(model_path, "*.pt")))
            if not candidates:
                raise FileNotFoundError(f"No .pt weights found in directory: {model_path}")

            # Prefer 'best*.pt' (or any filename containing 'best') to avoid accidentally
            # loading 'last.pt' or an intermediate checkpoint.
            def _rank(p: str):
                base = os.path.basename(p).lower()
                return (0 if "best" in base else 1, base)

            candidates = sorted(candidates, key=_rank)
            return candidates[0]
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model weights file not found: {model_path}")
        return model_path

    def predict(self, image, wells):
        """Run detection and attach predictions into the provided wells structure.

        Key fixes vs the previous implementation:
        - Predict directly from the in-memory numpy image instead of re-encoding to JPG.
          JPG is lossy and can noticeably degrade small/low-contrast objects.
        - Do not hard-force CPU unless explicitly configured.
        - Add lightweight logging for raw detections vs matched-to-well detections.
        """

        # Ensure wells have a 'predictions' list to append into
        for w in wells:
            w.setdefault("predictions", [])

        # Predict directly on the image array (BGR numpy) to avoid lossy re-encode.
        # Ultralytics accepts numpy arrays.
        predict_kwargs = {
            "conf": self.confidence_threshold,
            "verbose": False,
        }
        if self.device not in (None, "", "auto", "AUTO"):
            predict_kwargs["device"] = self.device

        results = self.model.predict(image, **predict_kwargs)

        raw_boxes = 0
        matched_boxes = 0

        for res in results:
            for box in res.boxes:
                raw_boxes += 1
                cid     = int(box.cls[0])
                cls_name= res.names[cid]
                conf    = float(box.conf[0])
                bbox    = box.xyxy[0].cpu().numpy().astype(int).tolist()
                label   = self._find_well(bbox, wells)
                if label:
                    for well in wells:
                        if well['label'] == label:
                            matched_boxes += 1
                            well['predictions'].append({
                                'class':      cls_name,
                                'confidence': conf,
                                'bbox':       bbox
                            })
                            color = COLORS.get(cid, (255, 255, 255))
                            cv2.rectangle(image, tuple(bbox[:2]), tuple(bbox[2:]), color, 2)
                            cv2.putText(image, f"{cls_name} {conf:.2f}",
                                        (bbox[0], bbox[1]-10),
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                            logger.debug(f"Detected {cls_name} in {label}: {conf:.2f}")

        logger.info(
            "YOLO detections: raw=%s, matched_to_wells=%s (conf=%.2f, device=%s)",
            raw_boxes,
            matched_boxes,
            self.confidence_threshold,
            self.device if self.device not in (None, "") else "auto",
        )
        return image, wells

    @staticmethod
    def _find_well(bbox, wells):
        """
        Match detection to well using centroid-based matching.
        Uses the center point of the bounding box instead of requiring
        the entire bbox to be inside the well.
        """
        x1, y1, x2, y2 = bbox
        # Calculate centroid of detection bbox
        center_x = (x1 + x2) / 2
        center_y = (y1 + y2) / 2

        for well in wells:
            tl, br = well['top_left'], well['bottom_right']
            # Check if centroid is inside well boundaries
            if tl[0] <= center_x <= br[0] and tl[1] <= center_y <= br[1]:
                return well['label']
        return None
