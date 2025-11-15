import { apiRequest } from '@/lib/queryClient';
import type { InsertPost, InsertPostTranslation, InsertPostMeta } from '@shared/schema';

/**
 * Admin Post API Orchestration
 * 
 * These helpers orchestrate 3-step API calls for creating/updating posts:
 * 1. Create/update base post
 * 2. Upsert translation
 * 3. Batch update meta
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
 * Create a new post with translation and meta
 * 3-step orchestration:
 * 1. POST /api/posts (create base post)
 * 2. POST /api/posts/:id/translations (create translation)
 * 3. For each meta: POST /api/posts/:id/meta (create meta)
 */
export async function createPost({ post, translation, meta }: CreatePostPayload) {
  // Step 1: Create base post
  const createResponse = await apiRequest('POST', '/api/posts', post);
  const createdPost = await createResponse.json();
  const postId = createdPost.id;

  // Step 2: Create translation
  await apiRequest('POST', `/api/posts/${postId}/translations`, translation);

  // Step 3: Create meta (batch)
  for (const metaItem of meta) {
    await apiRequest('POST', `/api/posts/${postId}/meta`, metaItem);
  }

  return createdPost;
}

/**
 * Update an existing post with translation and meta
 * 3-step orchestration:
 * 1. PATCH /api/posts/:id (update base post)
 * 2. POST /api/posts/:id/translations (upsert translation)
 * 3. For each meta: POST /api/posts/:id/meta (upsert meta)
 */
export async function updatePost({ postId, post, translation, meta }: UpdatePostPayload) {
  // Step 1: Update base post
  if (Object.keys(post).length > 0) {
    await apiRequest('PATCH', `/api/posts/${postId}`, post);
  }

  // Step 2: Upsert translation (POST endpoint supports upsert)
  await apiRequest('POST', `/api/posts/${postId}/translations`, translation);

  // Step 3: Upsert meta (POST endpoint supports upsert via setPostMeta)
  for (const metaItem of meta) {
    await apiRequest('POST', `/api/posts/${postId}/meta`, metaItem);
  }

  // Return updated post using apiRequest for consistent auth/error handling
  const response = await apiRequest('GET', `/api/posts/${postId}`);
  return response.json();
}

/**
 * Delete a post (cascades to translations and meta)
 */
export async function deletePost(postId: string) {
  await apiRequest('DELETE', `/api/posts/${postId}`);
}
