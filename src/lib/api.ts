import axios from 'axios';

const API_KEY = 'KQBsQ2Z2FhafKUvWr7Mrev84m5C3';
const BASE_URL = 'https://api.scrapecreators.com/v1/facebook/adLibrary';

export interface AdResponse {
  ad_archive_id: string;
  page_id: string;
  page_name: string;
  snapshot: {
    title: string | null;
    page_name: string;
    body?: {
      text?: string;
    };
    cards?: Array<{
      body: string;
      title: string;
      link_url: string;
      link_description: string;
      original_image_url: string;
      resized_image_url: string;
    }>;
  };
  is_active: boolean;
  start_date: number;
  end_date: number;
  url: string;
  start_date_string: string;
  end_date_string: string;
}

interface AdStatus {
  isActive: boolean;
  endDate: Date | null;
  url: string | null;
  title: string | null;
}

interface CompanyAdsResponse {
  results: Array<{
    ad_archive_id: string;
    page_id: string;
    page_name: string;
    snapshot: {
      title: string | null;
      page_name: string;
      body?: {
        text?: string;
      };
      cards?: Array<{
        body: string;
        title: string;
        link_url: string;
        link_description: string;
        original_image_url: string;
        resized_image_url: string;
      }>;
    };
    is_active: boolean;
    start_date?: number;
    end_date?: number;
    url: string;
    start_date_string: string;
    end_date_string?: string;
  }>;
  cursor?: string;
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json'
  }
});

export async function fetchCompanyAds(pageId: string, cursor?: string): Promise<CompanyAdsResponse> {
  try {
    const { data } = await api.get('/company/ads', {
      params: {
        pageId: pageId
      }
    });

    return {
      results: data.results.map((ad: any) => ({
        ad_archive_id: ad.ad_archive_id,
        page_id: ad.page_id,
        page_name: ad.page_name,
        snapshot: {
          title: ad.snapshot?.title || null,
          page_name: ad.page_name,
          body: ad.snapshot?.body,
          cards: ad.snapshot?.cards
        },
        is_active: ad.is_active,
        start_date: ad.start_date_string ? new Date(ad.start_date_string).getTime() : undefined,
        end_date: ad.end_date_string ? new Date(ad.end_date_string).getTime() : undefined,
        url: ad.url || '',
        start_date_string: ad.start_date_string,
        end_date_string: ad.end_date_string
      })),
      cursor: data.cursor
    };
  } catch (error) {
    console.error('Error fetching company ads:', error);
    throw error;
  }
}

export async function fetchAdDetails(adArchiveId: string) {
  const { data } = await api.get(`/company/ad`, {
    params: {
      id: adArchiveId
    }
  });
  return data;
}

export async function checkAdStatus(adId: string): Promise<AdStatus> {
  try {
    const { data } = await api.get(`/ad/status`, {
      params: {
        id: adId
      }
    });
    
    return {
      isActive: data.isActive,
      endDate: data.endDate ? new Date(data.endDate) : null,
      url: data.url || null,
      title: data.title || null
    };
  } catch (error) {
    console.error('Error checking ad status:', error);
    throw error;
  }
} 