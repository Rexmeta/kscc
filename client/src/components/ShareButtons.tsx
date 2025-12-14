import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import { Share2, MessageCircle, Copy, Check } from 'lucide-react';
import { SiWechat } from 'react-icons/si';
import { useToast } from '@/hooks/use-toast';

interface ShareButtonsProps {
  url: string;
  title: string;
  description?: string;
}

export default function ShareButtons({ url, title, description }: ShareButtonsProps) {
  const { toast } = useToast();
  const [wechatDialogOpen, setWechatDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${url}` : url;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast({
        title: '링크 복사됨',
        description: '링크가 클립보드에 복사되었습니다.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: '복사 실패',
        description: '링크 복사에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleWechatShare = () => {
    setWechatDialogOpen(true);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleWechatShare}
        className="gap-2 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
        data-testid="button-share-wechat"
      >
        <SiWechat className="h-4 w-4" />
        <span className="hidden sm:inline">WeChat</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyLink}
        className="gap-2"
        data-testid="button-copy-link"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">{copied ? '복사됨' : '링크 복사'}</span>
      </Button>

      <Dialog open={wechatDialogOpen} onOpenChange={setWechatDialogOpen}>
        <DialogContent className="w-full max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <SiWechat className="h-5 w-5" />
              WeChat으로 공유하기
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="p-4 bg-white rounded-xl shadow-sm border">
              <QRCodeSVG
                value={fullUrl}
                size={200}
                level="M"
                includeMargin={true}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                WeChat 앱에서 QR 코드를 스캔하세요
              </p>
              <p className="text-xs text-muted-foreground">
                친구에게 공유하거나 모멘트에 게시할 수 있습니다
              </p>
            </div>
            <div className="w-full">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground overflow-auto max-h-12 break-words p-1">
                    {fullUrl}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyLink}
                  className="shrink-0"
                  data-testid="button-copy-link-dialog"
                  title="링크 복사"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
