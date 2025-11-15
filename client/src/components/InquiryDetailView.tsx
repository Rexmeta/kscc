import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Mail, Send } from 'lucide-react';
import type { InquiryWithReplies, InquiryReply } from '@shared/schema';

export function InquiryDetailView({ inquiryId, onClose }: { inquiryId: string; onClose: () => void }) {
  const { toast } = useToast();
  const [replyMessage, setReplyMessage] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: inquiry, isLoading, refetch } = useQuery<InquiryWithReplies>({
    queryKey: ['/api/inquiries', inquiryId],
    queryFn: async () => {
      const response = await apiRequest(`/api/inquiries/${inquiryId}`);
      if (!response.ok) throw new Error('Failed to load inquiry details');
      return response.json();
    },
  });

  const handleSubmitReply = async () => {
    if (!replyMessage.trim()) {
      toast({
        title: '오류',
        description: '답변 내용을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiRequest(`/api/inquiries/${inquiryId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message: replyMessage, sendEmail }),
      });

      if (!response.ok) throw new Error('Failed to submit reply');

      toast({
        title: '성공',
        description: sendEmail ? '답변이 등록되고 이메일이 발송되었습니다.' : '답변이 등록되었습니다.',
      });

      setReplyMessage('');
      refetch();
    } catch (error) {
      toast({
        title: '오류',
        description: '답변 등록에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">로딩 중...</div>;
  }

  if (!inquiry) {
    return <div className="p-8 text-center">문의를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Original Inquiry */}
      <div className="bg-muted/50 p-4 rounded-lg">
        <h3 className="font-semibold text-lg mb-3">문의 내용</h3>
        <div className="space-y-2">
          <div>
            <span className="font-medium">제목:</span> {inquiry.subject}
          </div>
          <div>
            <span className="font-medium">문의자:</span> {inquiry.name}
          </div>
          <div>
            <span className="font-medium">이메일:</span> {inquiry.email}
          </div>
          {inquiry.phone && (
            <div>
              <span className="font-medium">연락처:</span> {inquiry.phone}
            </div>
          )}
          {inquiry.companyName && (
            <div>
              <span className="font-medium">회사명:</span> {inquiry.companyName}
            </div>
          )}
          <div className="mt-3">
            <span className="font-medium block mb-1">내용:</span>
            <p className="whitespace-pre-wrap text-sm">{inquiry.message}</p>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="outline">{inquiry.category}</Badge>
            <Badge variant={
              inquiry.status === 'resolved' ? 'default' :
              inquiry.status === 'in_progress' ? 'secondary' :
              'destructive'
            }>
              {inquiry.status === 'resolved' ? '해결됨' :
               inquiry.status === 'in_progress' ? '처리중' : '새 문의'}
            </Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(inquiry.createdAt).toLocaleDateString('ko-KR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Reply History */}
      {inquiry.replies && inquiry.replies.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">답변 히스토리</h3>
          {inquiry.replies.map((reply: InquiryReply & { responder: any }) => (
            <div key={reply.id} className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start justify-between mb-2">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">{reply.responder?.name || '관리자'}</span>
                  {' • '}
                  {new Date(reply.createdAt).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                {reply.emailSent && (
                  <Badge variant="outline" className="text-xs">
                    <Mail className="h-3 w-4 mr-1" />
                    이메일 발송됨
                  </Badge>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm">{reply.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* New Reply Form */}
      <div className="space-y-3 border-t pt-4">
        <h3 className="font-semibold text-lg">새 답변 작성</h3>
        <Textarea
          value={replyMessage}
          onChange={(e) => setReplyMessage(e.target.value)}
          placeholder="답변 내용을 입력하세요..."
          rows={6}
          className="resize-none"
          data-testid="textarea-inquiry-reply"
        />
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="rounded"
              data-testid="checkbox-send-email"
            />
            <span className="text-sm">이메일로 답변 발송</span>
          </label>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              data-testid="button-cancel-reply"
            >
              닫기
            </Button>
            <Button
              onClick={handleSubmitReply}
              disabled={isSubmitting || !replyMessage.trim()}
              data-testid="button-submit-reply"
            >
              {isSubmitting ? '전송 중...' : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  답변 전송
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
