import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface LoginRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogin: () => void;
}

export default function LoginRequiredDialog({
  open,
  onOpenChange,
  onLogin,
}: LoginRequiredDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>로그인이 필요한 메뉴입니다</DialogTitle>
          <DialogDescription>
            회원사와 자료센터는 로그인한 사용자만 이용할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
          <Button onClick={onLogin}>로그인 화면으로 이동</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}