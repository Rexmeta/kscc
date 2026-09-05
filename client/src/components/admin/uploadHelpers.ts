import { apiRequest } from '@/lib/queryClient';

export type ObjectVisibility = 'public' | 'private';
export const getResourceObjectAclVisibility = (
  visibility: 'public' | 'members' | 'premium',
  isPublished: boolean,
): ObjectVisibility => visibility === 'public' && isPublished ? 'public' : 'private';

export const setObjectAcl = async (
  objectPath: string,
  visibility: ObjectVisibility,
  uploadIntent = window.__lastUploadIntent,
) => {
  await apiRequest('PUT', '/api/images', {
      imageURL: objectPath,
      visibility,
      ...(uploadIntent ? { uploadIntent } : {}),
  });
};

export const setImagePublicAcl = async (objectPath: string) => {
  try {
    await setObjectAcl(objectPath, 'public');
  } catch (e) {
    console.error('Failed to set image ACL:', e);
  }
};

export const getUploadParameters = async (_file?: { type?: string }) => {
  const response = await apiRequest('POST', '/api/objects/upload', {});
  const data = await response.json();
  window.__lastUploadObjectPath = data.objectPath;
  window.__lastUploadIntent = data.uploadIntent;
  return {
    method: 'PUT' as const,
    url: data.uploadURL,
  };
};
