import { useQuery } from '@tanstack/react-query';
import { Download, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

type ConsentEvidenceSubjectType = 'account' | 'inquiry';
type ConsentEvidenceResponse = {
  subject: {
    type: ConsentEvidenceSubjectType;
    id: string;
  };
  evidence: Array<{
    id: string;
    purpose: string;
    policyVersion: string;
    consentedAt: string;
  }>;
};

const purposeLabels: Record<string, string> = {
  account_terms: '이용약관',
  account_privacy: '개인정보 처리방침',
  inquiry_privacy: '문의 개인정보 처리방침',
};

function evidencePath(subjectType: ConsentEvidenceSubjectType, subjectId: string) {
  const resource = subjectType === 'account' ? 'users' : 'inquiries';
  return `/api/admin/${resource}/${encodeURIComponent(subjectId)}/consent-evidence`;
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleString('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function ConsentEvidenceDialog({
  subjectType,
  subjectId,
  title,
  open,
  onOpenChange,
}: {
  subjectType: ConsentEvidenceSubjectType;
  subjectId: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const path = evidencePath(subjectType, subjectId);
  const evidenceQuery = useQuery<ConsentEvidenceResponse>({
    queryKey: [path],
    queryFn: async () => {
      const response = await apiRequest('GET', path);
      return response.json();
    },
    enabled: open,
  });

  const handleExport = async () => {
    try {
      const response = await apiRequest('GET', `${path}/export`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `consent-evidence-${subjectType}-${subjectId}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: '동의 증적을 내보냈습니다.' });
    } catch {
      toast({
        title: '동의 증적 내보내기 실패',
        description: '관리자 권한을 확인하고 다시 시도해주세요.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            {title} 동의 증적
          </DialogTitle>
          <DialogDescription>
            목적, 정책 버전, 동의 시각만 표시합니다. 원문과 연락처 등 불필요한 개인정보는 포함하지 않습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={evidenceQuery.isLoading || evidenceQuery.isError}
            data-testid={`button-export-consent-evidence-${subjectType}-${subjectId}`}
          >
            <Download className="mr-2 h-4 w-4" />
            CSV 내보내기
          </Button>
        </div>

        {evidenceQuery.isLoading && (
          <p className="py-8 text-center text-sm text-muted-foreground">동의 증적을 불러오는 중...</p>
        )}
        {evidenceQuery.isError && (
          <p className="py-8 text-center text-sm text-destructive">동의 증적을 불러오지 못했습니다.</p>
        )}
        {evidenceQuery.data && (
          evidenceQuery.data.evidence.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>동의 목적</TableHead>
                  <TableHead>정책 버전</TableHead>
                  <TableHead>동의 시각</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evidenceQuery.data.evidence.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{purposeLabels[entry.purpose] || entry.purpose}</TableCell>
                    <TableCell>{entry.policyVersion}</TableCell>
                    <TableCell>{formatDate(entry.consentedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              저장된 동의 증적이 없습니다.
            </p>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}