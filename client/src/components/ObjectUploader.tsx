// Reference: blueprint:javascript_object_storage
import { useState, useRef, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { Dashboard } from "@uppy/react";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Uppy CSS imports - required for Dashboard to display properly
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

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent 
          className="max-w-md p-0 overflow-hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle>파일 업로드</DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-4">
            <Dashboard
              uppy={uppy}
              proudlyDisplayPoweredByUppy={false}
              hideUploadButton={false}
              height={300}
              width="100%"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
