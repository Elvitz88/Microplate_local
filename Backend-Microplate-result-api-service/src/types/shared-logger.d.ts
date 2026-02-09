

declare module '../../shared/logger' {
  import type { Logger } from 'winston';
  export const logger: Logger;
  export default logger;
}

declare module '../../../shared/logger' {
  import type { Logger } from 'winston';
  export const logger: Logger;
  export default logger;
}

declare module '../../../shared/logger.js' {
  import type { Logger } from 'winston';
  export const logger: Logger;
  export default logger;
}

