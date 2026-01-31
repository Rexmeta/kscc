// Reference: blueprint:javascript_object_storage
import { useState, useRef, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";

// Uppy CSS imports - required for DashboardModal to display properly
import "@uppy/core/css/style.min.css";
import "@uppy/dashboard/css/style.min.css";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: (file: { type?: string; name?: string }) => Promise<{
    method: "PUT";
    url: string;
    headers?: Record<string, string>;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  
  // Use refs to always access the latest callbacks
  const onGetUploadParametersRef = useRef(onGetUploadParameters);
  const onCompleteRef = useRef(onComplete);
  
  // Keep refs updated with latest callbacks
  useEffect(() => {
    onGetUploadParametersRef.current = onGetUploadParameters;
    onCompleteRef.current = onComplete;
  }, [onGetUploadParameters, onComplete]);
  
  const uppy = useMemo(() => {
    const instance = new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: async (file) => {
          try {
            console.log('[Uppy] Getting upload parameters for:', file.name);
            const result = await onGetUploadParametersRef.current(file);
            console.log('[Uppy] Upload parameters received:', { url: result.url?.substring(0, 100) + '...', method: result.method });
            return result;
          } catch (error) {
            console.error('[Uppy] Error getting upload parameters:', error);
            throw error;
          }
        },
      })
      .on("upload-error", (file, error, response) => {
        console.error('[Uppy] Upload error:', { file: file?.name, error, response });
      })
      .on("complete", (result) => {
        console.log('[Uppy] Upload complete:', { successful: result.successful?.length, failed: result.failed?.length });
        onCompleteRef.current?.(result);
        setShowModal(false);
        instance.cancelAll();
      });
    return instance;
  }, [maxNumberOfFiles, maxFileSize]);

  useEffect(() => {
    return () => {
      uppy.cancelAll();
    };
  }, [uppy]);

  return (
    <div>
      <Button 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowModal(true);
        }} 
        className={buttonClassName}
        type="button"
        data-testid="button-open-uploader"
      >
        {children}
      </Button>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
      />
    </div>
  );
}
