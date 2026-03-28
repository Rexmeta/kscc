import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import RichTextEditor from '@/components/RichTextEditor';
import { type EventFormData } from '@/lib/adminPostMappers';
import { eventSchema } from '../adminSchemas';
import { useCreateEventPost } from '@/hooks/useAdminMutations';

interface CreateEventDialogProps {
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateEventDialog({ onSuccess, open, onOpenChange }: CreateEventDialogProps) {
  const { user } = useAuth();

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      description: '',
      content: '',
      eventDate: '',
      endDate: '',
      location: '',
      category: 'networking',
      eventType: 'offline',
      capacity: undefined,
      fee: 0,
      registrationDeadline: '',
      images: [],
      isPublic: true,
      isPublished: true,
    }
  });

  const isPublished = watch('isPublished');

  const createMutation = useCreateEventPost({
    userId: user?.id || '',
    onSuccess: () => {
      reset();
      onOpenChange(false);
      onSuccess();
    },
  });

  const onSubmit = (data: EventFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>새 행사 생성</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="form-label">제목</label>
            <Input {...register('title')} data-testid="input-event-title" />
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="form-label">설명</label>
            <Textarea {...register('description')} data-testid="textarea-event-description" />
            {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <label className="form-label">상세 내용</label>
            <RichTextEditor
              value={watch('content') || ''}
              onChange={(value) => setValue('content', value)}
              data-testid="editor-event-content"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">시작 날짜</label>
              <Input type="datetime-local" {...register('eventDate')} data-testid="input-event-date" />
              {errors.eventDate && <p className="text-sm text-destructive mt-1">{errors.eventDate.message}</p>}
            </div>
            <div>
              <label className="form-label">종료 날짜</label>
              <Input type="datetime-local" {...register('endDate')} data-testid="input-event-endDate" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">장소</label>
              <Input {...register('location')} data-testid="input-event-location" />
              {errors.location && <p className="text-sm text-destructive mt-1">{errors.location.message}</p>}
            </div>
            <div>
              <label className="form-label">카테고리</label>
              <Select defaultValue="networking" onValueChange={(v) => setValue('category', v)}>
                <SelectTrigger data-testid="select-event-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="networking">네트워킹</SelectItem>
                  <SelectItem value="seminar">세미나</SelectItem>
                  <SelectItem value="conference">컨퍼런스</SelectItem>
                  <SelectItem value="workshop">워크샵</SelectItem>
                </SelectContent>
              </Select>
              {errors.category && <p className="text-sm text-destructive mt-1">{errors.category.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="form-label">형식</label>
              <Select defaultValue="offline" onValueChange={(v) => setValue('eventType', v)}>
                <SelectTrigger data-testid="select-event-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="offline">오프라인</SelectItem>
                  <SelectItem value="online">온라인</SelectItem>
                  <SelectItem value="hybrid">하이브리드</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="form-label">정원</label>
              <Input type="number" {...register('capacity', { valueAsNumber: true })} data-testid="input-event-capacity" />
            </div>
            <div>
              <label className="form-label">참가비</label>
              <Input type="number" {...register('fee', { valueAsNumber: true })} data-testid="input-event-fee" />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch checked={isPublished} onCheckedChange={(c) => setValue('isPublished', c)} data-testid="switch-event-published" />
            <span className="text-sm">{isPublished ? '발행됨' : '초안'}</span>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-event">
              {createMutation.isPending ? '생성 중...' : '생성'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
