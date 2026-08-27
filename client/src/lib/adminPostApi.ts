import { apiRequest } from '@/lib/queryClient';
import type { InsertPost, InsertPostTranslation, InsertPostMeta } from '@shared/schema';

/**
 * Admin Post API Orchestration
 * 
 * Creation is sent as one permission-checked request. Updates retain the
 * existing stepwise flow because each step requires update permission.
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

/**
 * Create a complete post in one request so create-only operators do not need
 * update permission merely to attach the initial translation and metadata.
 */
export async function createPost({ post, translation, meta }: CreatePostPayload) {
  const response = await apiRequest('POST', '/api/posts', { post, translation, meta });
  return response.json();
}

/**
 * Update an existing post with translation and meta
 * 3-step orchestration:
 * 1. PATCH /api/posts/:id (update base post)
 * 2. POST /api/posts/:id/translations (upsert translation)
 * 3. For each meta: POST /api/posts/:id/meta (upsert meta)
 */
export async function updatePost({ postId, post, translation, meta }: UpdatePostPayload) {
  // Step 1: Update base post (exclude slug to prevent URL changes)
  const { slug, ...postWithoutSlug } = post as any;
  if (Object.keys(postWithoutSlug).length > 0) {
    await apiRequest('PATCH', `/api/posts/${postId}`, postWithoutSlug);
  }

  // Step 2: Upsert translation (POST endpoint supports upsert)
  await apiRequest('POST', `/api/posts/${postId}/translations`, translation);

  // Step 3: Upsert meta (POST endpoint supports upsert via setPostMeta)
  for (const metaItem of meta) {
    await apiRequest('POST', `/api/posts/${postId}/meta`, metaItem);
  }

  // Return updated post using apiRequest for consistent auth/error handling
  const response = await apiRequest('GET', `/api/posts/${postId}?admin=true`);
  return response.json();
}

/**
 * Delete a post (cascades to translations and meta)
 */
export async function deletePost(postId: string) {
  await apiRequest('DELETE', `/api/posts/${postId}`);
}
