import { apiRequest } from '@/lib/queryClient';
import type { InsertPost, InsertPostTranslation, InsertPostMeta } from '@shared/schema';

/**
 * Admin Post API Orchestration
 * 
 * Creation and updates are sent as one permission-checked request each.
 */

interface CreatePostPayload {
  post: Omit<InsertPost, 'id'>;
  translation: Omit<InsertPostTranslation, 'id' | 'postId'>;
  meta: Omit<InsertPostMeta, 'id' | 'postId'>[];
}

interface UpdatePostPayload {
  postId: string;
  post: Partial<Omit<InsertPost, 'id'>>;
  translation: Omit<InsertPostTranslation, 'id' | 'postId'>;
  meta: Omit<InsertPostMeta, 'id' | 'postId'>[];
}

export type PostPublicationStatus = 'draft' | 'published';

/**
 * Create a complete post in one request so create-only operators do not need
 * update permission merely to attach the initial translation and metadata.
 */
export async function createPost({ post, translation, meta }: CreatePostPayload) {
  const response = await apiRequest('POST', '/api/posts', { post, translation, meta });
  return response.json();
}

/**
 * Update an existing post, its translation, and its complete metadata set
 * in one server-side transaction. Metadata keys omitted from this payload
 * are intentionally removed.
 */
export async function updatePost({ postId, post, translation, meta }: UpdatePostPayload) {
  // Exclude slug to prevent URL changes while editing.
  const { slug, ...postWithoutSlug } = post as any;
  const response = await apiRequest('PATCH', `/api/posts/${postId}`, {
    post: postWithoutSlug,
    translation,
    meta,
  });
  return response.json();
}

export async function updatePostStatus(
  postId: string,
  status: PostPublicationStatus,
) {
  const response = await apiRequest('PATCH', `/api/posts/${postId}/status`, { status });
  return response.json();
}

/**
 * Delete a post (cascades to translations and meta)
 */
export async function deletePost(postId: string) {
  await apiRequest('DELETE', `/api/posts/${postId}`);
}
