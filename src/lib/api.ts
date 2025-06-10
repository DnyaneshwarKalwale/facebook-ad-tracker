import axios from 'axios';

const API_KEY = 'mRbr5W4OildUIOUT7BJRw0DeoS12';
const BASE_URL = 'https://api.scrapecreators.com/v1/facebook/adLibrary';

export interface AdResponse {
  ad_archive_id: string;
  page_id: string;
  page_name: string;
  snapshot: {
    title: string | null;
    page_name: string;
  };
  is_active: boolean;
  start_date: number;
  end_date: number;
  url: string;
  start_date_string: string;
  end_date_string: string;
}

export interface CompanyAdsResponse {
  results: AdResponse[];
  cursor?: string;
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'x-api-key': API_KEY
  }
});

export async function fetchCompanyAds(pageId: string, cursor?: string) {
  const params = cursor ? { cursor } : {};
  const { data } = await api.get<CompanyAdsResponse>(`/company/ads`, {
    params: {
      pageId,
      ...params
    }
  });
  return data;
}

export async function fetchAdDetails(adArchiveId: string) {
  const { data } = await api.get<AdResponse>(`/ad`, {
    params: {
      id: adArchiveId
    }
  });
  return data;
}

export async function checkAdStatus(adArchiveId: string) {
  try {
    const data = await fetchAdDetails(adArchiveId);
    return {
      isActive: data.is_active,
      endDate: data.end_date_string ? new Date(data.end_date_string) : null
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return {
        isActive: false,
        endDate: new Date()
      };
    }
    throw error;
  }
} 