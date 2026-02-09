# Vision Inference Service - Complete Specification

## Overview

The Vision Inference Service handles AI model inference for microplate image analysis. It processes captured images, runs ML models for object detection and classification, calculates domain-specific logic, and sends results to the prediction-db-service for storage.

## Technology Stack

- **Runtime**: Python 3.11+
- **Framework**: FastAPI
- **ML Framework**: PyTorch/TensorFlow
- **Computer Vision**: OpenCV, PIL
- **Image Processing**: scikit-image, albumentations
- **Database**: HTTP API calls to prediction-db-service
- **HTTP Client**: httpx
- **Validation**: Pydantic
- **Documentation**: OpenAPI 3.0

## Service Architecture

```python
# Project structure
vision-inference-service/
├── src/
│   ├── config/
│   │   ├── database.py
│   │   ├── model.py
│   │   └── settings.py
│   ├── controllers/
│   │   └── inference_controller.py
│   ├── services/
│   │   ├── inference_service.py
│   │   ├── model_service.py
│   │   ├── image_service.py
│   │   └── database_service.py
│   ├── models/
│   │   ├── yolo_model.py
│   │   ├── classification_model.py
│   │   └── model_registry.py
│   ├── utils/
│   │   ├── image_utils.py
│   │   ├── annotation_utils.py
│   │   └── validation_utils.py
│   ├── schemas/
│   │   └── inference_schemas.py
│   ├── types/
│   │   └── inference_types.py
│   └── main.py
├── models/
│   ├── yolo/
│   │   ├── best.pt
│   │   └── config.yaml
│   └── classification/
│       ├── model.pkl
│       └── scaler.pkl
├── tests/
├── requirements.txt
├── Dockerfile
└── .env.example
```

## API Endpoints

### Inference Endpoints

#### POST /api/v1/inference/predict
Run inference on an image and return prediction results.

**Request Body:**
```json
{
  "sample_no": "S123456",
  "submission_no": "SUB789",
  "image_path": "raw-images/S123456/456/20240115_103000_uuid.jpg",
  "image_url": "https://storage.example.com/raw-images/S123456/456/20240115_103000_uuid.jpg",
  "model_version": "v1.2.0",
  "confidence_threshold": 0.5,
  "description": "Microplate analysis run",
  "options": {
    "enable_annotation": true,
    "annotation_style": "bbox",
    "save_intermediate": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "run_id": 456,
    "sample_no": "S123456",
    "submission_no": "SUB789",
    "predict_at": "2024-01-15T10:30:00Z",
    "model_version": "v1.2.0",
    "status": "completed",
    "processing_time_ms": 1250,
    "annotated_image_url": "https://storage.example.com/annotated-images/S123456/456/20240115_103000_uuid_annotated.jpg",
    "statistics": {
      "total_detections": 96,
      "positive_count": 37,
      "negative_count": 59,
      "invalid_count": 0,
      "average_confidence": 0.87
    },
    "well_predictions": [
      {
        "well_id": "A1",
        "label": "positive",
        "class": "positive",
        "confidence": 0.95,
        "bbox": {
          "xmin": 12,
          "ymin": 34,
          "xmax": 56,
          "ymax": 78
        }
      }
    ],
    "row_counts": {
      "positive": 37,
      "negative": 59,
      "invalid": 0
    },
    "interface_results": {
      "distribution": {
        "positive": 37,
        "negative": 59,
        "invalid": 0
      },
      "concentration": {
        "positive_percentage": 38.54,
        "negative_percentage": 61.46
      },
      "quality_metrics": {
        "image_quality_score": 0.92,
        "well_detection_accuracy": 0.98,
        "overall_confidence": 0.87
      }
    }
  }
}
```

#### GET /api/v1/inference/models
Get available model versions and their status.

**Response:**
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "version": "v1.2.0",
        "name": "microplate_detector",
        "type": "yolo",
        "status": "active",
        "description": "YOLOv8 model for microplate detection",
        "created_at": "2024-01-01T00:00:00Z",
        "performance": {
          "accuracy": 0.95,
          "precision": 0.93,
          "recall": 0.91,
          "f1_score": 0.92
        }
      }
    ],
    "default_version": "v1.2.0"
  }
}
```

#### GET /api/v1/inference/status/:runId
Get the status of a specific inference run.

**Response:**
```json
{
  "success": true,
  "data": {
    "run_id": 456,
    "status": "completed",
    "progress": 100,
    "started_at": "2024-01-15T10:30:00Z",
    "completed_at": "2024-01-15T10:30:01Z",
    "processing_time_ms": 1250,
    "error_message": null
  }
}
```

## Model Architecture

### YOLO-based Detection Model
```python
class MicroplateDetector:
    def __init__(self, model_path: str, config_path: str):
        self.model = YOLO(model_path)
        self.config = self.load_config(config_path)
        self.class_names = self.config['class_names']
        self.confidence_threshold = self.config['confidence_threshold']
    
    async def predict(self, image: np.ndarray) -> DetectionResult:
        # Preprocess image
        processed_image = self.preprocess_image(image)
        
        # Run inference
        results = self.model(processed_image)
        
        # Post-process results
        detections = self.postprocess_detections(results[0])
        
        # Calculate domain-specific metrics
        domain_results = self.calculate_domain_logic(detections)
        
        return DetectionResult(
            detections=detections,
            domain_results=domain_results,
            processing_time=results[0].speed['inference']
        )
```

### Classification Model
```python
class WellClassifier:
    def __init__(self, model_path: str, scaler_path: str):
        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)
        self.feature_extractor = FeatureExtractor()
    
    def classify_well(self, well_image: np.ndarray) -> ClassificationResult:
        # Extract features
        features = self.feature_extractor.extract(well_image)
        
        # Scale features
        scaled_features = self.scaler.transform([features])
        
        # Predict
        prediction = self.model.predict(scaled_features)[0]
        probability = self.model.predict_proba(scaled_features)[0]
        
        return ClassificationResult(
            class_name=prediction,
            confidence=max(probability),
            probabilities=dict(zip(self.model.classes_, probability))
        )
```

## Implementation Details

### Inference Service
```python
class InferenceService:
    def __init__(self):
        self.model_registry = ModelRegistry()
        self.image_service = ImageService()
        self.database_service = DatabaseService()
        self.annotation_service = AnnotationService()
    
    async def predict(
        self,
        sample_no: str,
        image_path: str,
        model_version: str = "latest",
        options: InferenceOptions = None
    ) -> InferenceResult:
        try:
            # Load image
            image = await self.image_service.load_image(image_path)
            
            # Load model
            model = await self.model_registry.get_model(model_version)
            
            # Run inference
            start_time = time.time()
            detection_result = await model.predict(image)
            processing_time = (time.time() - start_time) * 1000
            
            # Create prediction run record
            run_id = await self.database_service.create_prediction_run(
                sample_no=sample_no,
                model_version=model_version,
                status="processing"
            )
            
            # Store well predictions
            await self.database_service.store_well_predictions(
                run_id=run_id,
                predictions=detection_result.detections
            )
            
            # Store row counts
            await self.database_service.store_row_counts(
                run_id=run_id,
                counts=detection_result.domain_results.row_counts
            )
            
            # Store interface results
            await self.database_service.store_interface_results(
                run_id=run_id,
                results=detection_result.domain_results.interface_results
            )
            
            # Generate annotated image if requested
            annotated_image_path = None
            if options and options.enable_annotation:
                annotated_image = await self.annotation_service.annotate_image(
                    image, detection_result.detections
                )
                annotated_image_path = await self.image_service.save_annotated_image(
                    sample_no, run_id, annotated_image
                )
            
            # Update prediction run status
            await self.database_service.update_prediction_run(
                run_id=run_id,
                status="completed",
                annotated_image_path=annotated_image_path,
                processing_time_ms=int(processing_time)
            )
            
            return InferenceResult(
                run_id=run_id,
                sample_no=sample_no,
                status="completed",
                processing_time_ms=int(processing_time),
                annotated_image_path=annotated_image_path,
                statistics=detection_result.domain_results.statistics,
                well_predictions=detection_result.detections,
                row_counts=detection_result.domain_results.row_counts,
                interface_results=detection_result.domain_results.interface_results
            )
            
        except Exception as e:
            # Update prediction run with error
            if 'run_id' in locals():
                await self.database_service.update_prediction_run(
                    run_id=run_id,
                    status="failed",
                    error_msg=str(e)
                )
            raise InferenceError(f"Inference failed: {str(e)}")
```

### Image Processing Service
```python
class ImageService:
    def __init__(self):
        self.supported_formats = ['.jpg', '.jpeg', '.png', '.tiff', '.bmp']
    
    async def load_image(self, image_path: str) -> np.ndarray:
        """Load image from file path or URL"""
        if image_path.startswith('http'):
            return await self.load_from_url(image_path)
        else:
            return await self.load_from_file(image_path)
    
    async def load_from_file(self, file_path: str) -> np.ndarray:
        """Load image from local file"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Image file not found: {file_path}")
        
        image = cv2.imread(file_path)
        if image is None:
            raise ValueError(f"Unable to load image: {file_path}")
        
        return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    async def load_from_url(self, url: str) -> np.ndarray:
        """Load image from URL"""
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            response.raise_for_status()
            
            image_array = np.frombuffer(response.content, np.uint8)
            image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
            
            if image is None:
                raise ValueError(f"Unable to decode image from URL: {url}")
            
            return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """Preprocess image for model inference"""
        # Resize to model input size
        target_size = (640, 640)
        resized = cv2.resize(image, target_size)
        
        # Normalize pixel values
        normalized = resized.astype(np.float32) / 255.0
        
        # Convert to tensor format (H, W, C) -> (C, H, W)
        tensor = np.transpose(normalized, (2, 0, 1))
        
        return tensor
```

### Annotation Service
```python
class AnnotationService:
    def __init__(self):
        self.colors = {
            'positive': (0, 255, 0),    # Green
            'negative': (255, 0, 0),    # Red
            'invalid': (0, 0, 255)      # Blue
        }
    
    async def annotate_image(
        self,
        image: np.ndarray,
        detections: List[Detection]
    ) -> np.ndarray:
        """Draw bounding boxes and labels on image"""
        annotated = image.copy()
        
        for detection in detections:
            # Draw bounding box
            bbox = detection.bbox
            color = self.colors.get(detection.class_name, (128, 128, 128))
            
            cv2.rectangle(
                annotated,
                (int(bbox.xmin), int(bbox.ymin)),
                (int(bbox.xmax), int(bbox.ymax)),
                color,
                2
            )
            
            # Draw label
            label = f"{detection.class_name}: {detection.confidence:.2f}"
            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
            
            cv2.rectangle(
                annotated,
                (int(bbox.xmin), int(bbox.ymin) - label_size[1] - 10),
                (int(bbox.xmin) + label_size[0], int(bbox.ymin)),
                color,
                -1
            )
            
            cv2.putText(
                annotated,
                label,
                (int(bbox.xmin), int(bbox.ymin) - 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (255, 255, 255),
                2
            )
        
        return annotated
```

### Domain Logic Calculator
```python
class DomainLogicCalculator:
    def __init__(self):
        self.well_mapping = self.load_well_mapping()
    
    def calculate_domain_logic(self, detections: List[Detection]) -> DomainResults:
        """Calculate domain-specific metrics from detections"""
        # Count by class
        class_counts = {}
        for detection in detections:
            class_name = detection.class_name
            class_counts[class_name] = class_counts.get(class_name, 0) + 1
        
        # Calculate percentages
        total_detections = len(detections)
        percentages = {
            class_name: (count / total_detections) * 100
            for class_name, count in class_counts.items()
        }
        
        # Calculate quality metrics
        avg_confidence = sum(d.confidence for d in detections) / total_detections
        high_confidence_count = sum(1 for d in detections if d.confidence > 0.8)
        
        return DomainResults(
            row_counts=class_counts,
            interface_results={
                "distribution": class_counts,
                "concentration": percentages,
                "quality_metrics": {
                    "average_confidence": avg_confidence,
                    "high_confidence_percentage": (high_confidence_count / total_detections) * 100,
                    "total_detections": total_detections
                }
            },
            statistics={
                "total_detections": total_detections,
                "average_confidence": avg_confidence,
                "class_distribution": class_counts
            }
        )
```

## Environment Configuration

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/microplates"

# Model Configuration
MODEL_PATH="/app/models"
DEFAULT_MODEL_VERSION="v1.2.0"
CONFIDENCE_THRESHOLD=0.5
NMS_THRESHOLD=0.4

# Image Processing
MAX_IMAGE_SIZE="50MB"
SUPPORTED_FORMATS="jpg,jpeg,png,tiff,bmp"
IMAGE_QUALITY=95

# Service Configuration
NODE_ENV="development"
PORT=6403
API_BASE_URL="http://localhost:6400"

# Image Ingestion Service
IMAGE_SERVICE_URL="http://image-ingestion-service:6402"
IMAGE_SERVICE_API_KEY="service-api-key"

# Processing
MAX_CONCURRENT_INFERENCES=5
BATCH_SIZE=1
ENABLE_GPU=true
GPU_DEVICE_ID=0

# Logging
LOG_LEVEL="INFO"
LOG_FORMAT="json"
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "INFERENCE_FAILED",
    "message": "Model inference failed",
    "details": {
      "run_id": 456,
      "error_type": "ModelError",
      "error_details": "CUDA out of memory"
    },
    "requestId": "uuid",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Common Error Codes
- `IMAGE_LOAD_FAILED`: Unable to load image
- `MODEL_LOAD_FAILED`: Unable to load model
- `INFERENCE_FAILED`: Model inference failed
- `ANNOTATION_FAILED`: Image annotation failed
- `DATABASE_ERROR`: Database operation failed
- `VALIDATION_ERROR`: Input validation failed
- `PROCESSING_TIMEOUT`: Inference timeout
- `GPU_ERROR`: GPU processing error

## Performance Optimization

### Model Optimization
- Model quantization for faster inference
- TensorRT optimization for GPU
- Batch processing for multiple images
- Model caching and warm-up

### Memory Management
- Image preprocessing optimization
- Memory pooling for large images
- Garbage collection tuning
- GPU memory management

### Concurrency
- Async processing for I/O operations
- Thread pool for CPU-intensive tasks
- Queue-based processing
- Rate limiting and throttling

## Monitoring and Metrics

### Key Metrics
- Inference success/failure rates
- Processing time per image
- Model accuracy and performance
- GPU/CPU utilization
- Memory usage patterns

### Health Checks
- `/healthz`: Basic health check
- `/readyz`: Readiness check (model loaded)
- `/metrics`: Prometheus metrics

### Logging
- Inference request/response logging
- Performance metrics
- Error tracking and debugging
- Model performance monitoring
