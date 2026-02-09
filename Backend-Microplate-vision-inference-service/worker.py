import pika
import json
import logging
import asyncio
import cv2
import os
import time
import uuid
from typing import Dict, Any

from app.services.grid_builder_service import GridBuilder
from app.services.predictor_service import Predictor
from app.services.result_processor_service import ResultProcessor
from app.services.db_service import db_service
from app.services.image_uploader_service import image_uploader
from app.services.calibration_service import CalibrationService
from app.config import Config
from app.logging_config import configure_logging

configure_logging(Config.LOG_LEVEL)
logger = logging.getLogger("vision-inference-worker")


class InferenceWorker:
    """Background worker for processing vision inference jobs from RabbitMQ queue"""

    def __init__(self, worker_id: str = "worker-1"):
        self.worker_id = worker_id
        self.host = Config.RABBITMQ_HOST
        self.port = Config.RABBITMQ_PORT
        self.username = Config.RABBITMQ_USER
        self.password = Config.RABBITMQ_PASS
        self.queue_name = Config.RABBITMQ_QUEUE

        # Reuse a single event loop across all jobs (avoid create/close overhead per job)
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)

        # Initialize services
        self.calibration_service = CalibrationService()
        self.grid_builder = GridBuilder(calibration_service=self.calibration_service)
        self.predictor = Predictor(Config.MODEL_PATH, Config.CONFIDENCE_THRESHOLD)
        self.processor = ResultProcessor()

        logger.info(f"[{self.worker_id}] Worker initialized")
        logger.info(f"[{self.worker_id}] RabbitMQ: {self.host}:{self.port}, Queue: {self.queue_name}")
        logger.info(f"[{self.worker_id}] Model: {Config.MODEL_PATH}")

    def connect(self):
        """Establish connection to RabbitMQ"""
        try:
            credentials = pika.PlainCredentials(self.username, self.password)
            parameters = pika.ConnectionParameters(
                host=self.host,
                port=self.port,
                credentials=credentials,
                heartbeat=600,
                blocked_connection_timeout=300
            )
            connection = pika.BlockingConnection(parameters)
            logger.info(f"[{self.worker_id}] Connected to RabbitMQ at {self.host}:{self.port}")
            return connection
        except Exception as e:
            logger.error(f"[{self.worker_id}] Failed to connect to RabbitMQ: {e}")
            raise

    async def process_inference_job(self, job_data: Dict[str, Any]):
        """Process a single inference job"""
        run_id = job_data.get("run_id")
        sample_no = job_data.get("sample_no")
        logger.info(f"[{self.worker_id}] Processing run_id={run_id}, sample_no={sample_no}")
        start_time = time.time()

        try:
            # Update status to processing
            await db_service.update_prediction_run(run_id, {"status": "processing"})
            logger.info(f"[{self.worker_id}] Updated status to 'processing' for run_id={run_id}")

            # Download image from Image Ingestion Service instead of reading local temp file
            pvc_image_path = job_data.get("image_path")  # PVC path from image-ingestion-service
            jwt_token = job_data.get("jwt_token")

            if not pvc_image_path:
                raise ValueError("No image_path provided in job_data")

            # Download image to worker's temp directory
            temp_dir = "/tmp"
            os.makedirs(temp_dir, exist_ok=True)
            local_filename = f"{run_id}_{os.path.basename(pvc_image_path)}"
            image_path = os.path.join(temp_dir, local_filename)

            # Download from image-ingestion-service using the filePath
            logger.info(f"[{self.worker_id}] Downloading image from PVC: {pvc_image_path}")
            download_success = await image_uploader.download_image_from_pvc(
                file_path=pvc_image_path,
                destination=image_path,
                jwt_token=jwt_token
            )

            if not download_success:
                raise FileNotFoundError(f"Failed to download image from PVC: {pvc_image_path}")

            img = cv2.imread(image_path)
            if img is None:
                raise ValueError(f"Unable to load downloaded image: {image_path}")

            height, width = img.shape[:2]
            logger.info(f"[{self.worker_id}] Image loaded: {width}x{height} from {image_path}")

            # Set calibration override from job data (if provided)
            calibration_config = job_data.get("calibration_config")
            if calibration_config:
                logger.info(f"[{self.worker_id}] Using calibration config from job message")
                self.grid_builder.set_calibration_override(calibration_config)
            else:
                logger.warning(f"[{self.worker_id}] No calibration config in job, using default grid")
                self.grid_builder.set_calibration_override(None)

            # Build grid
            original_image = img.copy()
            grid_img, wells, grid_metadata = self.grid_builder.draw(img)
            logger.info(f"[{self.worker_id}] Grid built: {len(wells)} wells detected")

            # Run prediction
            logger.info(f"[{self.worker_id}] Running AI inference...")
            annotated_img, wells = self.predictor.predict(grid_img, wells)
            logger.info(f"[{self.worker_id}] Prediction completed")

            # Restore original perspective
            annotated_img, wells = self.grid_builder.restore_original(
                annotated_img, wells, grid_metadata, original_image
            )
            logger.debug(f"[{self.worker_id}] Restored original perspective")

            # Save well predictions
            well_predictions = []
            for well in wells:
                for pred in well.get('predictions', []):
                    well_predictions.append({
                        "wellId": well['label'],
                        "label": well['label'],
                        "class": pred['class'],
                        "confidence": float(pred['confidence']),
                        "bbox": pred['bbox']
                    })

            # Save annotated image to local disk (needed before upload)
            upload_dir = getattr(Config, 'UPLOAD_DIR', '/tmp')
            os.makedirs(upload_dir, exist_ok=True)
            annotated_filename = f"{run_id}_annotated_{uuid.uuid4().hex[:8]}.jpg"
            annotated_path = os.path.join(upload_dir, annotated_filename)
            cv2.imwrite(annotated_path, annotated_img)
            logger.info(f"[{self.worker_id}] Annotated image saved to {annotated_path}")

            # Process results (CPU-only, no I/O)
            counts = self.processor.count_by_row(wells)
            last_positions = self.processor.last_positions(counts)
            non_flowing_count = self.processor.count_non_flowing_rows(wells)

            counts_data = {
                "counts": {
                    "raw_count": counts,
                    "last_positions": last_positions,
                    "non_flowing_count": non_flowing_count
                }
            }
            distribution = self.processor.to_dataframe(last_positions, non_flowing_count)
            results_data = {
                "results": {
                    "distribution": distribution
                }
            }

            # --- Parallel I/O: run all saves concurrently with asyncio.gather ---
            async def upload_annotated():
                try:
                    result = await image_uploader.upload_image(
                        sample_no=sample_no,
                        run_id=run_id,
                        file_path=annotated_path,
                        file_type="annotated",
                        description="annotated image",
                        jwt_token=job_data.get("jwt_token")
                    )
                    if result.get('success'):
                        path = result['data'].get('objectKey') or result['data'].get('filePath') or result['data'].get('signedUrl')
                        logger.info(f"[{self.worker_id}] Annotated image uploaded to PVC storage: {path}")
                        return path
                except Exception as e:
                    logger.warning(f"[{self.worker_id}] Failed to upload annotated image: {e}")
                return None

            parallel_tasks = [
                upload_annotated(),
                db_service.create_row_counts(run_id, counts_data),
                db_service.create_inference_results(run_id, results_data),
            ]
            if well_predictions:
                parallel_tasks.append(db_service.create_well_predictions(run_id, well_predictions))

            results = await asyncio.gather(*parallel_tasks, return_exceptions=True)

            # First result is the annotated image upload
            minio_annotated_path = results[0] if not isinstance(results[0], Exception) else None

            # Log any gather errors
            for i, r in enumerate(results):
                if isinstance(r, Exception):
                    logger.warning(f"[{self.worker_id}] Parallel task {i} failed: {r}")

            logger.info(f"[{self.worker_id}] Saved {len(well_predictions)} well predictions (parallel)")

            # Update status to completed (must run AFTER all saves finish)
            processing_time_ms = int((time.time() - start_time) * 1000)
            await db_service.update_prediction_run(run_id, {
                "status": "completed",
                "processingTimeMs": processing_time_ms,
                "annotatedImagePath": minio_annotated_path or annotated_path,
                "rawImagePath": job_data.get("image_path"),
                "createdBy": job_data.get("created_by")
            })

            logger.info(
                f"[{self.worker_id}] ✓ Completed run_id={run_id} in {processing_time_ms}ms "
                f"({len(well_predictions)} predictions)"
            )

            # Clean up local files
            try:
                if os.path.exists(image_path):
                    os.remove(image_path)
                if os.path.exists(annotated_path):
                    os.remove(annotated_path)
                logger.debug(f"[{self.worker_id}] Cleaned up local files")
            except Exception as e:
                logger.warning(f"[{self.worker_id}] Failed to clean up files: {e}")

        except Exception as e:
            logger.exception(f"[{self.worker_id}] ✗ Error processing run_id={run_id}: {e}")
            processing_time_ms = int((time.time() - start_time) * 1000)

            try:
                await db_service.update_prediction_run(run_id, {
                    "status": "failed",
                    "errorMsg": str(e),
                    "processingTimeMs": processing_time_ms
                })
                logger.info(f"[{self.worker_id}] Updated status to 'failed' for run_id={run_id}")
            except Exception as update_error:
                logger.error(f"[{self.worker_id}] Failed to update error status: {update_error}")

    def callback(self, ch, method, properties, body):
        """Callback when message received from queue"""
        try:
            job_data = json.loads(body)
            run_id = job_data.get('run_id')
            logger.info(f"[{self.worker_id}] → Received job: run_id={run_id}")

            # Process job (async) — reuse the persistent event loop
            self._loop.run_until_complete(self.process_inference_job(job_data))

            # Acknowledge message (success)
            ch.basic_ack(delivery_tag=method.delivery_tag)
            logger.info(f"[{self.worker_id}] ✓ Job acknowledged: run_id={run_id}")

        except json.JSONDecodeError as e:
            logger.error(f"[{self.worker_id}] Invalid JSON message: {e}")
            # Reject without requeue (bad message)
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

        except Exception as e:
            logger.exception(f"[{self.worker_id}] Failed to process message: {e}")
            # Reject and requeue (temporary failure)
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    def start(self):
        """Start consuming messages from queue"""
        logger.info(f"[{self.worker_id}] Starting worker...")
        logger.info(f"[{self.worker_id}] Connecting to RabbitMQ at {self.host}:{self.port}...")

        connection = self.connect()
        channel = connection.channel()

        # Declare queue (ensure it exists)
        channel.queue_declare(
            queue=self.queue_name,
            durable=True,
            arguments={'x-max-priority': 10}
        )
        logger.info(f"[{self.worker_id}] Queue declared: {self.queue_name}")

        # Set QoS - process 2 messages at a time per worker (prefetch for faster throughput)
        prefetch = int(os.environ.get('WORKER_PREFETCH_COUNT', '2'))
        channel.basic_qos(prefetch_count=prefetch)
        logger.info(f"[{self.worker_id}] QoS set: prefetch_count={prefetch}")

        # Start consuming
        channel.basic_consume(
            queue=self.queue_name,
            on_message_callback=self.callback
        )

        logger.info(f"[{self.worker_id}] ✓ Worker ready! Waiting for messages...")
        print(f"[{self.worker_id}] Worker is running. Press Ctrl+C to stop.")

        try:
            channel.start_consuming()
        except KeyboardInterrupt:
            logger.info(f"[{self.worker_id}] Received shutdown signal")
            channel.stop_consuming()
        except Exception as e:
            logger.error(f"[{self.worker_id}] Worker error: {e}")
            raise
        finally:
            # Graceful cleanup: close HTTP clients and event loop
            try:
                self._loop.run_until_complete(db_service.close())
                self._loop.run_until_complete(image_uploader.close())
            except Exception:
                pass
            if connection and not connection.is_closed:
                connection.close()
                logger.info(f"[{self.worker_id}] Connection closed")
            self._loop.close()


if __name__ == "__main__":
    import sys

    # Get worker ID from command line argument
    worker_id = sys.argv[1] if len(sys.argv) > 1 else "worker-1"

    logger.info(f"Starting Vision Inference Worker: {worker_id}")
    logger.info(f"Python version: {sys.version}")
    logger.info(f"Config loaded from: {Config}")

    try:
        worker = InferenceWorker(worker_id=worker_id)
        worker.start()
    except Exception as e:
        logger.error(f"Failed to start worker: {e}")
        sys.exit(1)
