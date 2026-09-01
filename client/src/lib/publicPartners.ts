import type { Partner } from '@shared/schema';

type PublicPartnersResponse = {
  partners: Partner[];
  total: number;
  page: number;
  totalPages: number;
};

export async function fetchPublicPartners(signal?: AbortSignal): Promise<Partner[]> {
  const response = await fetch('/api/partners?limit=12', { signal });
  if (!response.ok) throw new Error('Failed to fetch partners');
  const data = await response.json() as PublicPartnersResponse;
  return data.partners;
}