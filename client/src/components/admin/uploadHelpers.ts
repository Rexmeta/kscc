export const setImagePublicAcl = async (objectPath: string) => {
  const token = localStorage.getItem('token');
  try {
    await fetch('/api/images', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageURL: objectPath }),
    });
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
