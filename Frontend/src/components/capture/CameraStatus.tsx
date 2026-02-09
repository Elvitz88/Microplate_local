import { useEffect, useState } from 'react';
import { MdVideocam, MdVideocamOff, MdRefresh, MdCheckCircle, MdError } from 'react-icons/md';

interface CameraStatusProps {
  isConnected: boolean;
  isCapturing: boolean;
  error?: string | null;
  onCheckConnection?: () => void;
  className?: string;
}

export default function CameraStatus({ 
  isConnected, 
  isCapturing, 
  error, 
  onCheckConnection,
  className = '' 
}: CameraStatusProps) {
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    if (onCheckConnection) {
      onCheckConnection();
      setLastChecked(new Date());
    }
  }, [onCheckConnection]);

  const getStatusColor = () => {
    if (isCapturing) return 'text-blue-600 dark:text-blue-400';
    if (isConnected) return 'text-green-600 dark:text-green-400';
    if (error) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getStatusIcon = () => {
    if (isCapturing) return <MdVideocam className="h-4 w-4 animate-pulse" />;
    if (isConnected) return <MdCheckCircle className="h-4 w-4" />;
    if (error) return <MdError className="h-4 w-4" />;
    return <MdVideocamOff className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (isCapturing) return 'กำลังถ่ายภาพ...';
    if (isConnected) return 'กล้องพร้อมใช้งาน';
    if (error) return 'กล้องไม่พร้อมใช้งาน';
    return 'กำลังตรวจสอบ...';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={getStatusColor()}>
        {getStatusIcon()}
      </div>
      <span className={`text-sm font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      {onCheckConnection && (
        <button
          onClick={() => {
            onCheckConnection();
            setLastChecked(new Date());
          }}
          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          title="ตรวจสอบการเชื่อมต่อ"
        >
          <MdRefresh className="h-3 w-3" />
        </button>
      )}
      {lastChecked && (
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
          ({lastChecked.toLocaleTimeString('th-TH', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })})
        </span>
      )}
    </div>
  );
}
