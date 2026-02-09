import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { FolderOpenIcon, CameraIcon, ArrowPathIcon, PlayCircleIcon } from '@heroicons/react/24/outline'
import { useCapture } from '../../hooks/useCapture'
import CameraStatus from './CameraStatus'
import logger from '../../utils/logger'
import type { CalibrationBounds } from '../../services/calibration.service'
import { useTranslation } from 'react-i18next'

type Props = {
  onSelect: (file: File) => void
  onCaptured?: (url: string) => void
  className?: string
  sampleNo?: string
  submissionNo?: string
  description?: string
  disabled?: boolean
  onRunPrediction?: () => void
  onReset?: () => void
  canRunPrediction?: boolean
  isPredicting?: boolean
  actionText?: string
  annotatedImageUrl?: string | null
  isCalibrationMode?: boolean
  calibrationBounds?: CalibrationBounds | null
  calibrationColumns?: number[]
  calibrationRows?: number[]
  onBoundsChange?: (bounds: CalibrationBounds) => void
  onColumnChange?: (index: number, value: number) => void
  onRowChange?: (index: number, value: number) => void
  onCalibrationImageMetaChange?: (meta: { width: number; height: number } | null) => void
  calibrationInfoMessage?: string
}

export default function ImageUpload({
  onSelect,
  onCaptured,
  className,
  sampleNo,
  submissionNo,
  description,
  disabled,
  onRunPrediction,
  onReset,
  canRunPrediction,
  isPredicting,
  actionText,
  annotatedImageUrl,
  isCalibrationMode = false,
  calibrationBounds = null,
  calibrationColumns = [],
  calibrationRows = [],
  onBoundsChange,
  onColumnChange,
  onRowChange,
  onCalibrationImageMetaChange,
  calibrationInfoMessage,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const prevDescriptionRef = useRef<string | undefined>('')

  // Clear preview when plate no. (description) changes to prevent showing stale images
  useEffect(() => {
    if (prevDescriptionRef.current !== undefined &&
        prevDescriptionRef.current !== '' &&
        prevDescriptionRef.current !== description) {
      logger.info('🔄 ImageUpload: plate no. changed - clearing preview')
      setPreview(null)
    }
    prevDescriptionRef.current = description
  }, [description])
  const imageRef = useRef<HTMLImageElement | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  const [renderInfo, setRenderInfo] = useState<{ width: number; height: number; offsetX: number; offsetY: number; scale: number }>({
    width: 0,
    height: 0,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  })
  type DragState =
    | { type: 'column'; index: number }
    | { type: 'row'; index: number }
    | { type: 'corner'; corner: 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left' }
    | null

  const [dragState, setDragState] = useState<DragState>(null)
  const { t } = useTranslation()

  const displayImageSrc = isCalibrationMode
    ? (preview || annotatedImageUrl || undefined)
    : (annotatedImageUrl || preview || undefined)

  const getRelativePosition = useCallback(
    (event: MouseEvent | React.MouseEvent): { x: number; y: number } | null => {
      const imgEl = imageRef.current
      if (!imgEl || naturalSize.width === 0 || naturalSize.height === 0) {
        return null
      }
      const rect = imgEl.getBoundingClientRect()
      const scale = renderInfo.scale || 1
      if (scale === 0) {
        return null
      }
      const localX = event.clientX - rect.left - renderInfo.offsetX
      const localY = event.clientY - rect.top - renderInfo.offsetY
      const x = Math.min(Math.max(localX / scale, 0), naturalSize.width)
      const y = Math.min(Math.max(localY / scale, 0), naturalSize.height)
      return { x, y }
    },
    [naturalSize.width, naturalSize.height, renderInfo],
  )
  
  const {
    isCapturing,
    captureStatus,
    error: captureError,
    isConnected: isServiceConnected,
    captureImage,
    clearError,
    checkConnection
  } = useCapture({
    onSuccess: (response) => {
      logger.info('Capture successful')
      
      if (response?.imageUrl) {
        const bustUrl = `${response.imageUrl}${response.imageUrl.includes('?') ? '&' : '?'}t=${Date.now()}`
        setPreview(bustUrl);
        if (onCaptured) {
          onCaptured(bustUrl)
        }
      }
    },
    onError: (error) => {
      logger.error('Capture failed', error instanceof Error ? error.message : String(error))
    }
  });
  
  logger.debug('ImageUpload render - annotatedImageUrl:', annotatedImageUrl);
  logger.debug('ImageUpload render - preview:', preview);

  const handleChoose = () => inputRef.current?.click()

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    onSelect(file)
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  const handleCapture = async () => {
    if (disabled) {
      return;
    }

    try {
      const captureData = {
        sampleNo: sampleNo || 'UNKNOWN',
        submissionNo: submissionNo || 'UNKNOWN',
        description: description || 'Captured image'
      };

      logger.debug('Starting capture with data:', captureData);

      // onCaptured is already called in the onSuccess callback (line 120-122)
      // No need to call it again here to avoid double fetch with stale preview URL
      await captureImage(captureData);

    } catch (err) {
      logger.error('Capture failed', err instanceof Error ? err.message : String(err));
    }
  }

  const handleResetClick = () => {
    onReset?.()
    setPreview(null)
    onCalibrationImageMetaChange?.(null)
  }

  useEffect(() => {
    const imgEl = imageRef.current
    if (!imgEl) {
      return
    }

    const updateSize = () => {
      const elementWidth = imgEl.clientWidth
      const elementHeight = imgEl.clientHeight
      const naturalWidth = imgEl.naturalWidth
      const naturalHeight = imgEl.naturalHeight

      if (!naturalWidth || !naturalHeight) {
        return
      }

      setNaturalSize((prev) => {
        if (prev.width === naturalWidth && prev.height === naturalHeight) {
          return prev
        }
        return { width: naturalWidth, height: naturalHeight }
      })

      const scale = Math.min(elementWidth / naturalWidth, elementHeight / naturalHeight) || 1
      const renderedWidth = naturalWidth * scale
      const renderedHeight = naturalHeight * scale
      const offsetX = (elementWidth - renderedWidth) / 2
      const offsetY = (elementHeight - renderedHeight) / 2

      setRenderInfo({
        width: renderedWidth,
        height: renderedHeight,
        offsetX,
        offsetY,
        scale,
      })
    }

    updateSize()

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    if (!resizeObserverRef.current) {
      resizeObserverRef.current = new ResizeObserver(() => updateSize())
    }
    resizeObserverRef.current.observe(imgEl)

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
        resizeObserverRef.current = null
      }
    }
  }, [annotatedImageUrl, preview])

  useEffect(() => {
    if (!dragState || !isCalibrationMode) {
      return
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!calibrationBounds) {
        return
      }
      const position = getRelativePosition(event)
      if (!position) {
        return
      }

      if (dragState.type === 'column' && onColumnChange) {
        const index = dragState.index
        const min = index === 0 ? 0 : calibrationColumns[index - 1] + 1
        const max =
          index === calibrationColumns.length - 1 ? naturalSize.width : calibrationColumns[index + 1] - 1
        const clamped = Math.min(Math.max(position.x, min), max)
        onColumnChange(index, clamped)
      } else if (dragState.type === 'row' && onRowChange) {
        const index = dragState.index
        const min = index === 0 ? 0 : calibrationRows[index - 1] + 1
        const max = index === calibrationRows.length - 1 ? naturalSize.height : calibrationRows[index + 1] - 1
        const clamped = Math.min(Math.max(position.y, min), max)
        onRowChange(index, clamped)
      } else if (dragState.type === 'corner' && onBoundsChange) {
        const updated: CalibrationBounds = { ...calibrationBounds }
        const minWidth = 4
        const minHeight = 4
        switch (dragState.corner) {
          case 'top-left':
            updated.left = Math.min(Math.max(position.x, 0), calibrationBounds.right - minWidth)
            updated.top = Math.min(Math.max(position.y, 0), calibrationBounds.bottom - minHeight)
            break
          case 'top-right':
            updated.right = Math.max(Math.min(position.x, naturalSize.width), calibrationBounds.left + minWidth)
            updated.top = Math.min(Math.max(position.y, 0), calibrationBounds.bottom - minHeight)
            break
          case 'bottom-right':
            updated.right = Math.max(Math.min(position.x, naturalSize.width), calibrationBounds.left + minWidth)
            updated.bottom = Math.max(Math.min(position.y, naturalSize.height), calibrationBounds.top + minHeight)
            break
          case 'bottom-left':
            updated.left = Math.min(Math.max(position.x, 0), calibrationBounds.right - minWidth)
            updated.bottom = Math.max(Math.min(position.y, naturalSize.height), calibrationBounds.top + minHeight)
            break
        }
        onBoundsChange(updated)
      }
      event.preventDefault()
    }

    const handleMouseUp = () => {
      setDragState(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [
    dragState,
    isCalibrationMode,
    getRelativePosition,
    calibrationBounds,
    calibrationColumns,
    calibrationRows,
    naturalSize.width,
    naturalSize.height,
    onColumnChange,
    onRowChange,
    onBoundsChange,
  ])

  const displayBounds = useMemo(() => {
    if (
      !calibrationBounds ||
      naturalSize.width === 0 ||
      naturalSize.height === 0 ||
      renderInfo.scale === 0
    ) {
      return null
    }
    const scale = renderInfo.scale
    return {
      left: renderInfo.offsetX + calibrationBounds.left * scale,
      right: renderInfo.offsetX + calibrationBounds.right * scale,
      top: renderInfo.offsetY + calibrationBounds.top * scale,
      bottom: renderInfo.offsetY + calibrationBounds.bottom * scale,
    }
  }, [calibrationBounds, naturalSize.width, naturalSize.height, renderInfo])

  const displayColumns = useMemo(() => {
    if (naturalSize.width === 0 || renderInfo.scale === 0) {
      return []
    }
    const scale = renderInfo.scale
    return calibrationColumns.map((value) => renderInfo.offsetX + value * scale)
  }, [calibrationColumns, naturalSize.width, renderInfo])

  const displayRows = useMemo(() => {
    if (naturalSize.height === 0 || renderInfo.scale === 0) {
      return []
    }
    const scale = renderInfo.scale
    return calibrationRows.map((value) => renderInfo.offsetY + value * scale)
  }, [calibrationRows, naturalSize.height, renderInfo])

  const renderCalibrationOverlay = () => {
    if (!displayBounds) {
      return null
    }

    const boundsWidth = displayBounds.right - displayBounds.left
    const boundsHeight = displayBounds.bottom - displayBounds.top

    const cornerHandles =
      isCalibrationMode && calibrationBounds
        ? [
            { key: 'top-left' as const, x: displayBounds.left, y: displayBounds.top },
            { key: 'top-right' as const, x: displayBounds.right, y: displayBounds.top },
            { key: 'bottom-right' as const, x: displayBounds.right, y: displayBounds.bottom },
            { key: 'bottom-left' as const, x: displayBounds.left, y: displayBounds.bottom },
          ]
        : []

    return (
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute border-2 border-blue-400 pointer-events-none rounded-sm"
          style={{
            left: `${displayBounds.left}px`,
            top: `${displayBounds.top}px`,
            width: `${boundsWidth}px`,
            height: `${boundsHeight}px`,
          }}
        />
        
        {displayColumns.map((x, index) => (
          <div
            key={`col-line-${index}`}
            className="absolute border border-blue-200/70 pointer-events-none"
            style={{
              left: `${x}px`,
              top: `${displayBounds.top}px`,
              height: `${boundsHeight}px`,
            }}
          />
        ))}
        
        {displayRows.map((y, index) => (
          <div
            key={`row-line-${index}`}
            className="absolute border border-blue-200/70 pointer-events-none"
            style={{
              top: `${y}px`,
              left: `${displayBounds.left}px`,
              width: `${boundsWidth}px`,
            }}
          />
        ))}
        
        {isCalibrationMode && (
          <>
            {cornerHandles.map((corner) => (
              <button
                key={`corner-${corner.key}`}
                type="button"
                aria-label={`Drag ${corner.key} corner`}
                className="absolute -translate-x-1/2 -translate-y-1/2 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center shadow-lg pointer-events-auto cursor-move z-10"
                style={{ left: `${corner.x}px`, top: `${corner.y}px` }}
                onMouseDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setDragState({ type: 'corner', corner: corner.key })
                }}
                title={t('capture.calibration.tooltips.corner')}
              >
                ●
              </button>
            ))}
            
            {displayColumns.map((x, index) => (
              <button
                key={`col-handle-${index}`}
                type="button"
                aria-label={`Drag column ${index + 1}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-lg pointer-events-auto cursor-move z-10"
                style={{ left: `${x}px`, top: `${displayBounds.top + boundsHeight / 2}px` }}
                onMouseDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setDragState({ type: 'column', index })
                }}
                title={t('capture.calibration.tooltips.column', { index: index + 1 })}
              >
                ▮
              </button>
            ))}
            
            {displayRows.map((y, index) => (
              <button
                key={`row-handle-${index}`}
                type="button"
                aria-label={`Drag row ${index + 1}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-lg pointer-events-auto cursor-move z-10"
                style={{ left: `${displayBounds.left + boundsWidth / 2}px`, top: `${y}px` }}
                onMouseDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setDragState({ type: 'row', index })
                }}
                title={t('capture.calibration.tooltips.row', { index: index + 1 })}
              >
                ▯
              </button>
            ))}
          </>
        )}
      </div>
    )
  }

  return (
    <Card className={`p-0 overflow-hidden ${className || ''}`}>
      <div className="bg-gray-50 dark:bg-gray-700 flex items-center justify-center relative" style={{ height: '640px' }}>
        {displayImageSrc ? (
          <>
            <div
              className="absolute inset-0 w-full h-full flex items-center justify-center bg-transparent"
            >
              <img 
                ref={imageRef}
                src={displayImageSrc} 
                alt={annotatedImageUrl && displayImageSrc === annotatedImageUrl ? "Annotated microplate result showing well detections" : "Original captured microplate image"} 
                className="w-full h-full object-contain pointer-events-none"
                onLoad={(event) => {
                  const currentSrc = displayImageSrc;
                  logger.debug('ImageUpload: Image loaded successfully:', currentSrc);
                  const img = event.currentTarget
                  const naturalWidth = img.naturalWidth || 0
                  const naturalHeight = img.naturalHeight || 0
                  setNaturalSize({ width: naturalWidth, height: naturalHeight })
                  const elementWidth = img.clientWidth || 0
                  const elementHeight = img.clientHeight || 0
                  if (naturalWidth && naturalHeight && elementWidth && elementHeight) {
                    const scale = Math.min(elementWidth / naturalWidth, elementHeight / naturalHeight) || 1
                    const renderedWidth = naturalWidth * scale
                    const renderedHeight = naturalHeight * scale
                    const offsetX = (elementWidth - renderedWidth) / 2
                    const offsetY = (elementHeight - renderedHeight) / 2
                    setRenderInfo({
                      width: renderedWidth,
                      height: renderedHeight,
                      offsetX,
                      offsetY,
                      scale,
                    })
                  } else {
                    setRenderInfo({
                      width: elementWidth,
                      height: elementHeight,
                      offsetX: 0,
                      offsetY: 0,
                      scale: 1,
                    })
                  }
                  onCalibrationImageMetaChange?.({ width: naturalWidth, height: naturalHeight })
                }}
                onError={(e) => {
                  logger.error('ImageUpload: Image failed to load:', e.currentTarget.src);
                }}
              />
            </div>
            {isCalibrationMode && renderCalibrationOverlay()}
          </>
        )
          : (<div className="text-gray-400 dark:text-gray-500 text-sm">{t('capture.uploadCard.noImage')}</div>)}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} aria-label="Upload image input" />
      </div>
      <div className="flex flex-col items-center py-4">
        {isCapturing && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800" role="status" aria-live="polite">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm font-medium">
                {captureStatus.message || t('capture.uploadCard.buttons.capturing')}
              </span>
            </div>
            {captureStatus.progress && (
              <div className="mt-2 w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${captureStatus.progress}%` }}
                ></div>
              </div>
            )}
          </div>
        )}

        {captureError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800" role="alert">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <span className="text-sm font-medium">❌ {captureError}</span>
              </div>
              <button
                onClick={clearError}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleChoose} 
            className="border-gray-500 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
            aria-label={t('capture.uploadCard.buttons.upload')}
          >
            <FolderOpenIcon className="h-4 w-4 mr-2" aria-hidden="true" />
            {t('capture.uploadCard.buttons.upload')}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleCapture} 
            disabled={!!disabled || isCapturing} 
            className="border-gray-500 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
            aria-label={isCapturing ? t('capture.uploadCard.buttons.capturing') : t('capture.uploadCard.buttons.capture')}
          >
            <CameraIcon className="h-4 w-4 mr-2" aria-hidden="true" />
            {isCapturing ? t('capture.uploadCard.buttons.capturing') : t('capture.uploadCard.buttons.capture')}
          </Button>
          
          <CameraStatus
            isConnected={isServiceConnected}
            isCapturing={isCapturing}
            error={captureError}
            onCheckConnection={checkConnection}
            className="ml-4"
          />
          {onReset && (
            <Button 
              variant="outline" 
              onClick={handleResetClick} 
              disabled={!preview}
              title={!preview ? t('capture.uploadCard.buttons.resetDisabled') : t('capture.uploadCard.buttons.resetHint')}
              className="border-gray-500 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
              aria-label={t('capture.uploadCard.buttons.reset')}
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" aria-hidden="true" />
              {t('capture.uploadCard.buttons.reset')}
            </Button>
          )}
          {onRunPrediction && (
            <Button 
              variant="primary"
              onClick={onRunPrediction} 
              disabled={isPredicting || !canRunPrediction}
              title={
                isPredicting
                  ? t('capture.uploadCard.buttons.runPredictionRunning')
                  : !sampleNo
                    ? t('capture.uploadCard.buttons.runPredictionNeedSample')
                    : !canRunPrediction
                      ? t('capture.uploadCard.buttons.runPredictionNeedImage')
                      : undefined
              }
              className={`flex items-center gap-2 ${
                (isPredicting || !canRunPrediction) 
                  ? 'bg-gray-400 dark:bg-gray-600 text-gray-200 dark:text-gray-300 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              aria-label={isPredicting ? t('capture.uploadCard.buttons.runPredictionRunning') : t('capture.uploadCard.buttons.runPrediction')}
            >
              <PlayCircleIcon className="h-4 w-4" aria-hidden="true" />
              {isPredicting ? t('capture.uploadCard.buttons.runPredictionRunning') : t('capture.uploadCard.buttons.runPrediction')}
            </Button>
          )}
        </div>
        {actionText && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center px-4">{actionText}</div>
        )}
        {isCalibrationMode && (
            <div className="mt-4 flex flex-col items-center gap-3 text-sm text-blue-600 dark:text-blue-300">
            <div className="text-center px-4">
                {calibrationInfoMessage || t('capture.calibration.infoMessageDefault')}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
