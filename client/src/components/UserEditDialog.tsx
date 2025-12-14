import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Save, X } from 'lucide-react';

interface UserEditDialogProps {
  user: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function UserEditDialog({
  user,
  isOpen,
  onOpenChange,
  onSuccess,
}: UserEditDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    role: user.role || 'user',
    userType: user.userType || 'user',
    membershipTier: user.membershipTier || 'free',
  });

  useEffect(() => {
    setFormData({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'user',
      userType: user.userType || 'user',
      membershipTier: user.membershipTier || 'free',
    });
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: '유효성 검사 오류',
        description: '사용자 이름을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.email.trim()) {
      toast({
        title: '유효성 검사 오류',
        description: '이메일을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: '유효성 검사 오류',
        description: '올바른 이메일 형식을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await apiRequest('PUT', `/api/users/${user.id}`, {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        userType: formData.userType,
        membershipTier: formData.membershipTier,
      });

      toast({
        title: '저장 완료',
        description: '사용자 정보가 성공적으로 업데이트되었습니다.',
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: '저장 실패',
        description: '사용자 정보 업데이트 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>사용자 정보 수정</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-name">사용자 이름</Label>
            <Input
              id="user-name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="사용자 이름"
              data-testid={`input-user-name-${user.id}`}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-email">이메일</Label>
            <Input
              id="user-email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="사용자 이메일"
              data-testid={`input-user-email-${user.id}`}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-role">역할</Label>
            <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
              <SelectTrigger id="user-role" data-testid={`select-user-role-${user.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">관리자</SelectItem>
                <SelectItem value="operator">운영자</SelectItem>
                <SelectItem value="user">사용자</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-type">계정 유형</Label>
            <Select value={formData.userType} onValueChange={(value) => handleInputChange('userType', value)}>
              <SelectTrigger id="user-type" data-testid={`select-user-type-${user.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">관리자</SelectItem>
                <SelectItem value="operator">운영자</SelectItem>
                <SelectItem value="company">회원사</SelectItem>
                <SelectItem value="user">일반</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-tier">회원등급</Label>
            <Select value={formData.membershipTier} onValueChange={(value) => handleInputChange('membershipTier', value)}>
              <SelectTrigger id="user-tier" data-testid={`select-user-tier-${user.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">무료</SelectItem>
                <SelectItem value="bronze">브론즈</SelectItem>
                <SelectItem value="silver">실버</SelectItem>
                <SelectItem value="gold">골드</SelectItem>
                <SelectItem value="platinum">플래티넘</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isSaving}
              data-testid="button-cancel"
            >
              <X className="h-4 w-4 mr-2" />
              취소
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={isSaving}
              data-testid="button-save"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              저장
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
