// Unified Media Uploader for Images and Videos
import { useState, useRef, useEffect, useMemo } from "react";
import Uppy from "@uppy/core";
import { Dashboard } from "@uppy/react";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Image as ImageIcon, 
  Video, 
  Link as LinkIcon, 
  Upload, 
  X, 
  Play,
  ExternalLink
} from "lucide-react";

import "@uppy/core/css/style.min.css";
import "@uppy/dashboard/css/style.min.css";

export interface MediaItem {
  type: 'image' | 'video';
  url: string;
  isUploaded?: boolean; // true if uploaded to object storage, false if external URL
}

interface MediaUploaderProps {
  mediaItems: MediaItem[];
  onMediaChange: (items: MediaItem[]) => void;
  onGetUploadParameters: (file: { type?: string; name?: string }) => Promise<{
    method: "PUT";
    url: string;
    headers?: Record<string, string>;
  }>;
  onUploadComplete?: (objectPath: string) => void;
  maxFiles?: number;
  maxFileSize?: number;
  className?: string;
}

// Helper to determine if URL is a video
function isVideoUrl(url: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
  const lowerUrl = url.toLowerCase();
  
  // Check file extension
  if (videoExtensions.some(ext => lowerUrl.includes(ext))) {
    return true;
  }
  
  // Check for video platforms
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be') || 
      lowerUrl.includes('vimeo.com')) {
    return true;
  }
  
  return false;
}

// Helper to get embed URL for YouTube/Vimeo
function getEmbedUrl(url: string): string | null {
  try {
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    return null;
  } catch {
    return null;
  }
}

export function MediaUploader({
  mediaItems,
  onMediaChange,
  onGetUploadParameters,
  onUploadComplete,
  maxFiles = 10,
  maxFileSize = 52428800, // 50MB default for videos
  className = "",
}: MediaUploaderProps) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [uploadType, setUploadType] = useState<'image' | 'video'>('image');
  
  const onGetUploadParametersRef = useRef(onGetUploadParameters);
  const onUploadCompleteRef = useRef(onUploadComplete);
  
  useEffect(() => {
    onGetUploadParametersRef.current = onGetUploadParameters;
    onUploadCompleteRef.current = onUploadComplete;
  }, [onGetUploadParameters, onUploadComplete]);
  
  const uppy = useMemo(() => {
    const allowedTypes = uploadType === 'image' 
      ? ['image/*'] 
      : ['video/*'];
    
    const instance = new Uppy({
      restrictions: {
        maxNumberOfFiles: maxFiles,
        maxFileSize,
        allowedFileTypes: allowedTypes,
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: async (file) => {
          try {
            console.log('[MediaUploader] Getting upload parameters for:', file.name);
            const result = await onGetUploadParametersRef.current(file);
            return result;
          } catch (error) {
            console.error('[MediaUploader] Error getting upload parameters:', error);
            throw error;
          }
        },
      })
      .on("upload-error", (file, error, response) => {
        console.error('[MediaUploader] Upload error:', { file: file?.name, error, response });
      })
      .on("complete", (result) => {
        console.log('[MediaUploader] Upload complete:', { successful: result.successful?.length });
        
        if (result.successful && result.successful.length > 0) {
          const newItems: MediaItem[] = result.successful.map(file => {
            // Extract the object path from the upload URL
            const uploadUrl = file.uploadURL || '';
            const objectPath = uploadUrl.split('?')[0];
            
            // Call onUploadComplete for each file to set ACL
            if (onUploadCompleteRef.current) {
              onUploadCompleteRef.current(objectPath);
            }
            
            return {
              type: uploadType,
              url: objectPath,
              isUploaded: true,
            };
          });
          
          onMediaChange([...mediaItems, ...newItems]);
        }
        
        setShowUploadModal(false);
        instance.cancelAll();
      });
    return instance;
  }, [maxFiles, maxFileSize, uploadType, mediaItems, onMediaChange]);

  useEffect(() => {
    return () => {
      uppy.cancelAll();
    };
  }, [uppy]);
  
  const addUrlItem = () => {
    const url = newUrl.trim();
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      const type: 'image' | 'video' = isVideoUrl(url) ? 'video' : 'image';
      const newItem: MediaItem = {
        type,
        url,
        isUploaded: false,
      };
      onMediaChange([...mediaItems, newItem]);
      setNewUrl('');
      setShowUrlInput(false);
    }
  };
  
  const removeItem = (index: number) => {
    const updated = mediaItems.filter((_, i) => i !== index);
    onMediaChange(updated);
  };
  
  const images = mediaItems.filter(item => item.type === 'image');
  const videos = mediaItems.filter(item => item.type === 'video');

  return (
    <div className={`border rounded-lg p-4 bg-muted/20 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          미디어
          {mediaItems.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {images.length > 0 && `이미지 ${images.length}`}
              {images.length > 0 && videos.length > 0 && ', '}
              {videos.length > 0 && `동영상 ${videos.length}`}
            </span>
          )}
        </label>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-xs"
          >
            <LinkIcon className="h-3.5 w-3.5 mr-1" />
            URL
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setUploadType('image');
              setShowUploadModal(true);
            }}
            className="text-xs"
          >
            <ImageIcon className="h-3.5 w-3.5 mr-1" />
            이미지
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setUploadType('video');
              setShowUploadModal(true);
            }}
            className="text-xs"
          >
            <Video className="h-3.5 w-3.5 mr-1" />
            동영상
          </Button>
        </div>
      </div>

      {/* URL Input */}
      {showUrlInput && (
        <div className="flex gap-2 mb-4">
          <Input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://... (이미지 또는 동영상 URL)"
            className="flex-1"
            data-testid="input-media-url"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addUrlItem();
              }
            }}
          />
          <Button type="button" onClick={addUrlItem} size="sm">
            추가
          </Button>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setShowUrlInput(false);
              setNewUrl('');
            }}
          >
            취소
          </Button>
        </div>
      )}
      
      {/* Media Grid */}
      {mediaItems.length > 0 ? (
        <div className="space-y-4">
          {/* Images */}
          {images.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <ImageIcon className="h-3 w-3" /> 이미지
              </p>
              <div className="grid grid-cols-3 gap-2">
                {images.map((item, idx) => {
                  const globalIndex = mediaItems.indexOf(item);
                  return (
                    <div key={globalIndex} className="relative group aspect-square">
                      <img
                        src={item.url}
                        alt={`미디어 ${idx + 1}`}
                        className="w-full h-full object-cover rounded-lg border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f0f0f0" width="100" height="100"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999">Error</text></svg>';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(globalIndex)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        data-testid={`button-remove-media-${globalIndex}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {!item.isUploaded && (
                        <div className="absolute bottom-1 left-1">
                          <ExternalLink className="h-3 w-3 text-white drop-shadow" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Videos */}
          {videos.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Video className="h-3 w-3" /> 동영상
              </p>
              <div className="space-y-2">
                {videos.map((item, idx) => {
                  const globalIndex = mediaItems.indexOf(item);
                  const embedUrl = getEmbedUrl(item.url);
                  
                  return (
                    <div key={globalIndex} className="relative group flex items-center gap-3 p-3 border rounded-lg bg-background">
                      {embedUrl ? (
                        <div className="w-20 h-14 rounded bg-muted flex-shrink-0 overflow-hidden">
                          <iframe
                            src={embedUrl}
                            className="w-full h-full pointer-events-none"
                            title={`동영상 ${idx + 1}`}
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <Play className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.url}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.isUploaded ? '업로드됨' : '외부 URL'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(globalIndex)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                        data-testid={`button-remove-media-${globalIndex}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ImageIcon className="h-6 w-6 opacity-30" />
            <Video className="h-6 w-6 opacity-30" />
          </div>
          <p>미디어가 없습니다</p>
          <p className="text-xs mt-1">이미지나 동영상을 업로드하거나 URL을 추가하세요</p>
        </div>
      )}

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent 
          className="max-w-md p-0 overflow-hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle>
              {uploadType === 'image' ? '이미지 업로드' : '동영상 업로드'}
            </DialogTitle>
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
