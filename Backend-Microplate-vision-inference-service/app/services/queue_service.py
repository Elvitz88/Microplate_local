import pika
import json
import logging
from typing import Dict, Any, Optional
from app.config import Config

logger = logging.getLogger(__name__)


class QueueService:
    """RabbitMQ Queue Service for Vision Inference Jobs"""

    def __init__(self):
        self.host = Config.RABBITMQ_HOST
        self.port = Config.RABBITMQ_PORT
        self.username = Config.RABBITMQ_USER
        self.password = Config.RABBITMQ_PASS
        self.queue_name = Config.RABBITMQ_QUEUE
        logger.info(f"QueueService initialized with host={self.host}, queue={self.queue_name}")

    def _get_connection(self):
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
            return pika.BlockingConnection(parameters)
        except Exception as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            raise

    def publish_inference_job(self, job_data: Dict[str, Any]) -> bool:
        """
        Publish inference job to queue

        Args:
            job_data: Dictionary containing job information
                {
                    "run_id": 123,
                    "sample_no": "SAMPLE001",
                    "submission_no": "SUB001",
                    "image_path": "minio://raw-images/abc123.jpg",
                    "local_image_path": "/tmp/abc123.jpg",
                    "model_version": "v1.0",
                    "confidence_threshold": 0.5,
                    "description": "...",
                    "priority": 5,
                    "created_by": "user_id",
                    "jwt_token": "..."
                }

        Returns:
            bool: True if successful, False otherwise
        """
        connection = None
        try:
            connection = self._get_connection()
            channel = connection.channel()

            # Declare queue (idempotent)
            channel.queue_declare(
                queue=self.queue_name,
                durable=True,  # Queue survives broker restart
                arguments={
                    'x-max-priority': 10  # Enable priority queue
                }
            )

            # Get priority (default 5)
            priority = job_data.get('priority', 5)
            if not isinstance(priority, int) or priority < 1 or priority > 10:
                priority = 5

            # Publish message
            channel.basic_publish(
                exchange='',
                routing_key=self.queue_name,
                body=json.dumps(job_data),
                properties=pika.BasicProperties(
                    delivery_mode=2,  # Persistent message
                    priority=priority,
                    content_type='application/json'
                )
            )

            logger.info(f"Published job to queue: run_id={job_data.get('run_id')}, priority={priority}")
            return True

        except Exception as e:
            logger.error(f"Failed to publish job to queue: {e}")
            return False

        finally:
            if connection and not connection.is_closed:
                connection.close()

    def get_queue_stats(self) -> Optional[Dict[str, Any]]:
        """Get queue statistics"""
        connection = None
        try:
            connection = self._get_connection()
            channel = connection.channel()

            method = channel.queue_declare(
                queue=self.queue_name,
                durable=True,
                passive=True  # Don't create, just check
            )

            stats = {
                "queue_name": self.queue_name,
                "message_count": method.method.message_count,
                "consumer_count": method.method.consumer_count
            }

            logger.debug(f"Queue stats: {stats}")
            return stats

        except Exception as e:
            logger.error(f"Failed to get queue stats: {e}")
            return None

        finally:
            if connection and not connection.is_closed:
                connection.close()

    def purge_queue(self) -> bool:
        """Purge all messages from queue (use with caution!)"""
        connection = None
        try:
            connection = self._get_connection()
            channel = connection.channel()

            channel.queue_purge(queue=self.queue_name)
            logger.warning(f"Queue purged: {self.queue_name}")
            return True

        except Exception as e:
            logger.error(f"Failed to purge queue: {e}")
            return False

        finally:
            if connection and not connection.is_closed:
                connection.close()


# Singleton instance
queue_service = QueueService()
