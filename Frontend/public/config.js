// Runtime config: use localhost when opened from local, otherwise cloud URLs.
(function () {
  var origin = typeof window !== 'undefined' ? window.location.origin : '';
  var isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

  if (isLocal) {
    // Local: same origin (frontend proxy / webpack devServer forwards to backend)
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
    window.API_BASE_URL = origin;
    window.WS_CAPTURE_URL = origin.replace(/^http/, 'ws') + '/ws/capture';
    window.AUTH_PATH_PREFIX = '';
    window.IMAGE_PATH_PREFIX = '';
    window.VISION_PATH_PREFIX = '';
    window.RESULTS_PATH_PREFIX = '';
    window.LABWARE_PATH_PREFIX = '';
    window.PREDICTION_PATH_PREFIX = '';
    window.CAPTURE_PATH_PREFIX = '';
  } else {
    // Cloud / deployed
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
