import { visionApi } from './api'
import logger from '../utils/logger'

export interface CalibrationBounds {
  left: number
  right: number
  top: number
  bottom: number
}

export interface CalibrationConfig {
  enabled: boolean
  bounds?: CalibrationBounds
  columns?: number[]
  rows?: number[]
  imageWidth?: number
  imageHeight?: number
  updatedAt?: string
}

interface CalibrationRequestPayload {
  imageWidth: number
  imageHeight: number
  bounds: CalibrationBounds
  columns: number[]
  rows: number[]
}

class CalibrationApiService {
  async getCalibrationConfig(): Promise<CalibrationConfig> {
    try {
      const response = await visionApi.get<any>('/api/v1/vision/calibration')
      return this.transformResponse(response)
    } catch (error) {
      logger.error('❌ CalibrationService: Failed to fetch calibration config:', error)
      throw error
    }
  }

  async saveCalibrationConfig(payload: CalibrationRequestPayload): Promise<CalibrationConfig> {
    try {
      const response = await visionApi.post<any>('/api/v1/vision/calibration', {
        image_width: payload.imageWidth,
        image_height: payload.imageHeight,
        bounds: payload.bounds,
        columns: payload.columns,
        rows: payload.rows,
      })
      return this.transformResponse(response)
    } catch (error) {
      logger.error('❌ CalibrationService: Failed to save calibration config:', error)
      throw error
    }
  }

  async clearCalibrationConfig(): Promise<CalibrationConfig> {
    try {
      const response = await visionApi.delete<any>('/api/v1/vision/calibration')
      return this.transformResponse(response)
    } catch (error) {
      logger.error('❌ CalibrationService: Failed to clear calibration config:', error)
      throw error
    }
  }

  private transformResponse(data: any): CalibrationConfig {
    if (!data || !data.enabled) {
      return { enabled: false }
    }

    return {
      enabled: Boolean(data.enabled),
      bounds: data.bounds
        ? {
            left: data.bounds.left ?? 0,
            right: data.bounds.right ?? 0,
            top: data.bounds.top ?? 0,
            bottom: data.bounds.bottom ?? 0,
          }
        : undefined,
      columns: Array.isArray(data.columns) ? data.columns.slice() : undefined,
      rows: Array.isArray(data.rows) ? data.rows.slice() : undefined,
      imageWidth: data.image_width ?? data.imageWidth,
      imageHeight: data.image_height ?? data.imageHeight,
      updatedAt: data.updated_at ?? data.updatedAt,
    }
  }
}

export const calibrationService = new CalibrationApiService()

