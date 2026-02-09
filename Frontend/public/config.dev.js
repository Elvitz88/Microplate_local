// Dev config: same logic as config.js (local vs cloud by origin).
(function () {
  var origin = typeof window !== 'undefined' ? window.location.origin : '';
  var isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

  if (isLocal) {
    window.API_HOST = origin + '/api';
    window.APP_ENV = 'local';
    window.AUTH_SERVICE_URL = origin;
    window.IMAGE_SERVICE_URL = origin;
    window.VISION_SERVICE_URL = origin;
    window.RESULTS_SERVICE_URL = origin;
    window.LABWARE_SERVICE_URL = origin;
    window.PREDICTION_SERVICE_URL = origin;
    window.VISION_CAPTURE_SERVICE_URL = origin;
    window.MINIO_BASE_URL = origin;
    window.WS_CAPTURE_URL = origin.replace(/^http/, 'ws') + '/ws/capture';
    window.AUTH_PATH_PREFIX = '';
    window.IMAGE_PATH_PREFIX = '/ingestion';
    window.VISION_PATH_PREFIX = '/vision';
    window.RESULTS_PATH_PREFIX = '/result';
    window.LABWARE_PATH_PREFIX = '/interface';
    window.PREDICTION_PATH_PREFIX = '/prediction';
    window.CAPTURE_PATH_PREFIX = '/capture';
  } else {
    window.API_HOST = 'https://dev-labexam.betagro.com/api';
    window.APP_ENV = 'dev';
    window.AUTH_SERVICE_URL = 'https://dev-labexam.betagro.com';
    window.IMAGE_SERVICE_URL = 'https://dev-labexam.betagro.com';
    window.VISION_SERVICE_URL = 'https://dev-labexam.betagro.com';
    window.RESULTS_SERVICE_URL = 'https://dev-labexam.betagro.com';
    window.LABWARE_SERVICE_URL = 'https://dev-labexam.betagro.com';
    window.PREDICTION_SERVICE_URL = 'https://dev-labexam.betagro.com';
    window.VISION_CAPTURE_SERVICE_URL = 'https://dev-labexam.betagro.com';
    window.MINIO_BASE_URL = 'https://dev-labexam.betagro.com/minio';
    window.WS_CAPTURE_URL = 'wss://dev-labexam.betagro.com/ws/capture';
    window.AUTH_PATH_PREFIX = '/auth';
    window.IMAGE_PATH_PREFIX = '/ingestion';
    window.VISION_PATH_PREFIX = '/vision';
    window.RESULTS_PATH_PREFIX = '/result';
    window.LABWARE_PATH_PREFIX = '/interface';
    window.PREDICTION_PATH_PREFIX = '/prediction';
    window.CAPTURE_PATH_PREFIX = '/capture';
  }
})();
