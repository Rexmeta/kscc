import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import RichTextEditor from '@/components/RichTextEditor';
import { eventSchema, type EventFormValues } from '../adminSchemas';
import { getMetaValue } from '@/lib/postHelpers';
import type { PostWithTranslations } from '@shared/schema';
import { useUpdateEventPost } from '@/hooks/useAdminMutations';
import { formatEventDateTimeLocal, parseEventDateTime } from '@shared/eventDateTime';

export function EditEventForm({ event, onSuccess }: { event: PostWithTranslations; onSuccess: () => void }) {
  const { user, isAdmin, hasPermission } = useAuth();
  const canPublish = isAdmin || hasPermission('event.publish');
  const [, setLocation] = useLocation();

  const translation = event.translations?.[0];
  const eventMeta = event.meta || [];
  const getMetaVal = (key: string) => {
    const val = getMetaValue(eventMeta, key);
    return val !== null ? String(val) : '';
  };

  const eventDate = parseEventDateTime(getMetaValue(eventMeta, 'event.eventDate'));
  const isPastEvent = eventDate ? eventDate < new Date() : false;

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: translation?.title || '',
      description: translation?.excerpt || '',
      content: translation?.content || '',
      eventDate: formatEventDateTimeLocal(getMetaValue(eventMeta, 'event.eventDate')),
      endDate: formatEventDateTimeLocal(getMetaValue(eventMeta, 'event.endDate')),
      location: getMetaVal('event.location'),
      category: getMetaVal('event.category') || 'networking',
      eventType: getMetaVal('event.eventType') || 'offline',
      capacity: parseInt(getMetaVal('event.capacity')) || undefined,
      fee: parseInt(getMetaVal('event.fee')) || 0,
      registrationDeadline: formatEventDateTimeLocal(getMetaValue(eventMeta, 'event.registrationDeadline')),
      isPublic: true,
      isPublished: event.status === 'published',
    }
  });

  const isPublished = watch('isPublished');

  const updateMutation = useUpdateEventPost({ postId: event.id, onSuccess });

  return (
    <form onSubmit={handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
      <div>
        <label className="form-label">제목</label>
        <Input {...register('title')} />
        {errors.title && <p className="text-sm text-destructive">{String(errors.title.message)}</p>}
      </div>
      <div>
        <label className="form-label">설명</label>
        <Textarea {...register('description')} />
        {errors.description && <p className="text-sm text-destructive">{String(errors.description.message)}</p>}
      </div>
      <div>
        <label className="form-label">상세 내용</label>
        <RichTextEditor
          value={watch('content') || ''}
          onChange={(value) => setValue('content', value)}
          data-testid="editor-event-content-edit"
        />
      </div>
      {isPastEvent && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-2">
            <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">이미 지난 행사입니다</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                지난 행사의 일정은 수정할 수 없습니다. 새로운 일정으로 행사를 개최하려면 새 행사를 등록해 주세요.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/40"
            onClick={() => {
              onSuccess();
              setTimeout(() => {
                setLocation('/admin?tab=events&action=create');
              }, 100);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            새 행사 등록하기
          </Button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">시작 날짜</label>
          <Input
            type="datetime-local"
            {...register('eventDate')}
            disabled={isPastEvent}
            className={isPastEvent ? 'bg-muted cursor-not-allowed' : ''}
          />
          {isPastEvent && <p className="text-xs text-muted-foreground mt-1">지난 행사는 일정 수정이 불가합니다</p>}
        </div>
        <div>
          <label className="form-label">종료 날짜</label>
          <Input
            type="datetime-local"
            {...register('endDate')}
            disabled={isPastEvent}
            className={isPastEvent ? 'bg-muted cursor-not-allowed' : ''}
          />
        </div>
      </div>
      <div>
        <label className="form-label">장소</label>
        <Input {...register('location')} disabled={isPastEvent} className={isPastEvent ? 'bg-muted cursor-not-allowed' : ''} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="form-label">카테고리</label>
          <Select defaultValue={getMetaVal('event.category') || 'networking'} onValueChange={(v) => setValue('category', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="networking">네트워킹</SelectItem>
              <SelectItem value="seminar">세미나</SelectItem>
              <SelectItem value="conference">컨퍼런스</SelectItem>
              <SelectItem value="workshop">워크샵</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="form-label">정원</label>
          <Input type="number" {...register('capacity', { valueAsNumber: true })} />
        </div>
        <div>
          <label className="form-label">참가비</label>
          <Input type="number" {...register('fee', { valueAsNumber: true })} />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Switch checked={isPublished} onCheckedChange={(c) => setValue('isPublished', c)} disabled={!canPublish} />
        <span className="text-sm">{isPublished ? '발행됨' : '초안'}</span>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? '수정 중...' : '수정'}</Button>
        <Button type="button" variant="outline" onClick={onSuccess}>취소</Button>
      </div>
    </form>
  );
}
