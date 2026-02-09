                                            
import os
import warnings
from ultralytics import YOLO
from collections import defaultdict
import pandas as pd

import logging

                 
logger = logging.getLogger(__name__)

warnings.filterwarnings('ignore')
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

                        
COLORS = {0: (255, 0, 0), 1: (0, 255, 0), 2: (0, 0, 255)}

class ResultProcessor:

    def __init__(self, target_class="Flowing"):
        self.target = target_class

    def count_by_row(self, wells):
        """Count target class occurrences per well position (row x column)"""
        counts = defaultdict(lambda: [0] * 12)
        for well in wells:
            predictions = well.get('predictions', [])
            if not predictions:
                continue

            row = well['label'][0]
            col = int(well['label'][1:]) - 1

            # Count target class in this well
            target_count = sum(1 for pred in predictions if pred.get('class') == self.target)
            counts[row][col] = target_count

        final = {r: c[:max(i for i, v in enumerate(c) if v > 0) + 1]
                 for r, c in counts.items() if any(c)}
        logger.info(f"Final row counts: {final}")
        return final

    def count_non_flowing_rows(self, wells):
        """Count rows that have predictions but NO Flowing class at all.
        These are rows where all detections are Non_Flowing only."""
        rows_with_predictions = defaultdict(lambda: {'has_flowing': False, 'has_any': False})

        for well in wells:
            predictions = well.get('predictions', [])
            if not predictions:
                continue

            row = well['label'][0]
            rows_with_predictions[row]['has_any'] = True

            has_flowing = any(pred.get('class') == self.target for pred in predictions)
            if has_flowing:
                rows_with_predictions[row]['has_flowing'] = True

        # Count rows that have predictions but no Flowing
        non_flowing_rows = [
            r for r, info in rows_with_predictions.items()
            if info['has_any'] and not info['has_flowing']
        ]
        logger.info(f"Non-flowing rows: {non_flowing_rows} (count: {len(non_flowing_rows)})")
        return len(non_flowing_rows)

    def last_positions(self, row_counts):
        """Find last positive position in each row"""
        result = {}
        for r, vs in row_counts.items():
            positive_positions = [i+1 for i, v in enumerate(vs) if v > 0]
            if positive_positions:
                result[r] = max(positive_positions)
        return result

    def to_dataframe(self, last_positions, non_flowing_count=0):
        """Convert last positions to distribution format for database"""
        cols = list(range(1, 13))
        df = pd.DataFrame(0, index=list("ABCDEFGH"), columns=cols)

        # Mark last positive position for each row
        for r, c in last_positions.items():
            if 1 <= c <= 12:
                df.at[r, c] = 1

        # Calculate totals
        df.loc['Total'] = df.sum()
        df['total'] = df.sum(axis=1)
        df = df[['total'] + cols]
        total = df.loc['Total'].to_dict()

        # Add non-flowing count as key "0"
        total[0] = non_flowing_count
        total['total'] = int(total.get('total', 0)) + non_flowing_count

        logger.info(f"Result JSON: {total}")
        return total