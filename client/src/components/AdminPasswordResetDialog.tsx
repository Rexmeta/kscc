import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ApiRequestError, apiRequest } from '@/lib/queryClient';
import { KeyRound, Loader2, X } from 'lucide-react';

interface AdminPasswordResetDialogProps {
  user: { id: string; name: string; email: string };
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function getApiErrorMessage(error: unknown): string {
  if (
    error instanceof ApiRequestError
    && error.responseBody
    && typeof error.responseBody === 'object'
    && 'message' in error.responseBody
    && typeof error.responseBody.message === 'string'
  ) {
    return error.responseBody.message;
  }
  return '비밀번호를 리셋하지 못했습니다.';
}

export default function AdminPasswordResetDialog({
  user,
  isOpen,
  onOpenChange,
}: AdminPasswordResetDialogProps) {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setConfirmation('');
    }
  }, [isOpen, user.id]);

  const handleReset = async () => {
    if (password.length < 8) {
      toast({
        title: '유효성 검사 오류',
        description: '비밀번호는 8자 이상이어야 합니다.',
        variant: 'destructive',
      });
      return;
    }
    if (password !== confirmation) {
      toast({
        title: '유효성 검사 오류',
        description: '비밀번호가 일치하지 않습니다.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await apiRequest('POST', `/api/users/${user.id}/password-reset`, { password });
      toast({
        title: '비밀번호를 리셋했습니다',
        description: '기존 로그인 세션이 모두 종료되었습니다.',
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: '비밀번호 리셋 실패',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            비밀번호 리셋
          </DialogTitle>
          <DialogDescription>
            {user.name} ({user.email})의 새 비밀번호를 설정합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-reset-password">새 비밀번호</Label>
            <Input
              id="admin-reset-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="8자 이상"
              data-testid={`input-reset-password-${user.id}`}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-reset-password-confirmation">새 비밀번호 확인</Label>
            <Input
              id="admin-reset-password-confirmation"
              type="password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="new-password"
              placeholder="새 비밀번호를 다시 입력하세요"
              data-testid={`input-reset-password-confirmation-${user.id}`}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            리셋하면 해당 사용자의 기존 로그인 세션이 모두 만료됩니다.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isSaving}
              data-testid="button-cancel-password-reset"
            >
              <X className="mr-2 h-4 w-4" />
              취소
            </Button>
            <Button
              onClick={handleReset}
              className="flex-1"
              disabled={isSaving}
              data-testid={`button-confirm-password-reset-${user.id}`}
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
              리셋
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}