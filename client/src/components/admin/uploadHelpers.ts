export type ObjectVisibility = 'public' | 'private';

export const getResourceObjectAclVisibility = (
  visibility: 'public' | 'members' | 'premium',
  isPublished: boolean,
): ObjectVisibility => visibility === 'public' && isPublished ? 'public' : 'private';

export const setObjectAcl = async (objectPath: string, visibility: ObjectVisibility) => {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/images', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageURL: objectPath, visibility }),
  });
  if (!response.ok) {
    throw new Error(`Failed to set object ACL (${response.status})`);
  }
};

export const setImagePublicAcl = async (objectPath: string) => {
  try {
    await setObjectAcl(objectPath, 'public');
  } catch (e) {
    console.error('Failed to set image ACL:', e);
  }
};

export const getUploadParameters = async (_file?: { type?: string }) => {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/objects/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  const data = await response.json();
  window.__lastUploadObjectPath = data.objectPath;
  return {
    method: 'PUT' as const,
    url: data.uploadURL,
  };
};
