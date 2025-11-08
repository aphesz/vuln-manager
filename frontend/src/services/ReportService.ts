// frontend/src/services/ReportService.ts
import axios from 'axios';

const API_BASE_URL = '/api';

export interface ReportGenerationRequest {
  template_type: string;
  format: string;
  project_ids?: number[];
  start_date?: string;
  end_date?: string;
  include_sections?: string[];
  send_email?: boolean;
  email_to?: string[];
  email_cc?: string[];
  email_bcc?: string[];
  email_subject?: string;
  custom_template_id?: number;
}

export interface EmailSettings {
  id?: number;
  smtp_host: string;
  smtp_port: number;
  smtp_username?: string;
  smtp_password?: string;
  smtp_use_tls: boolean;
  smtp_use_ssl: boolean;
  from_email: string;
  from_name?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ReportBranding {
  id?: number;
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  company_website?: string;
  logo_path?: string;
  primary_color: string;
  secondary_color: string;
  footer_text?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ReportGenerationResponse {
  success: boolean;
  message: string;
  file_path?: string;
  email_sent?: boolean;
}

const ReportService = {
  // Generate report
  generateReport: async (request: ReportGenerationRequest): Promise<Blob | ReportGenerationResponse> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/reports/generate`, request, {
        responseType: request.send_email ? 'json' : 'blob',
      });
      
      return response.data;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  },

  // Email Settings
  getEmailSettings: async (): Promise<EmailSettings | null> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/settings/email`);
      return response.data;
    } catch (error) {
      console.error('Error fetching email settings:', error);
      throw error;
    }
  },

  createEmailSettings: async (settings: Partial<EmailSettings>): Promise<EmailSettings> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/settings/email`, settings);
      return response.data;
    } catch (error) {
      console.error('Error creating email settings:', error);
      throw error;
    }
  },

  updateEmailSettings: async (id: number, settings: Partial<EmailSettings>): Promise<EmailSettings> => {
    try {
      const response = await axios.put(`${API_BASE_URL}/settings/email/${id}`, settings);
      return response.data;
    } catch (error) {
      console.error('Error updating email settings:', error);
      throw error;
    }
  },

  testEmailConnection: async (): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/settings/email/test`);
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.detail) {
        return { success: false, message: error.response.data.detail };
      }
      throw error;
    }
  },

  // Branding Settings
  getBranding: async (): Promise<ReportBranding | null> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/settings/branding`);
      return response.data;
    } catch (error) {
      console.error('Error fetching branding:', error);
      throw error;
    }
  },

  updateBranding: async (branding: Partial<ReportBranding>): Promise<ReportBranding> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/settings/branding`, branding);
      return response.data;
    } catch (error) {
      console.error('Error updating branding:', error);
      throw error;
    }
  },
};

export default ReportService;
