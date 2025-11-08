// frontend/src/services/CustomTemplateService.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export interface TemplateSection {
  type: 'text' | 'table' | 'chart' | 'metrics' | 'findings';
  title: string;
  content?: string;  // For text sections
  widget?: string;   // For chart/metrics widgets
  filters?: {
    risk_rating?: string[];
    issue_status?: string[];
    review_status?: string[];
    owasp_category?: string[];
  };
  layout?: {
    columns?: number;
    width?: string;
    height?: string;
  };
}

export interface TemplateLayout {
  page_size: 'letter' | 'a4';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface CustomTemplateJSON {
  sections: TemplateSection[];
  layout: TemplateLayout;
}

export interface CustomReportTemplate {
  id: number;
  name: string;
  description: string | null;
  template_json: string;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
  usage_count: number;
}

export interface CustomTemplateCreate {
  name: string;
  description?: string;
  template_json: string;
  is_public?: boolean;
  created_by?: string;
}

export interface CustomTemplateUpdate {
  name?: string;
  description?: string;
  template_json?: string;
  is_public?: boolean;
}

class CustomTemplateService {
  /**
   * Create a new custom report template
   */
  async createTemplate(template: CustomTemplateCreate): Promise<CustomReportTemplate> {
    const response = await axios.post(`${API_BASE_URL}/custom-templates`, template);
    return response.data;
  }

  /**
   * List all custom templates with optional filters
   */
  async listTemplates(params?: {
    skip?: number;
    limit?: number;
    search?: string;
    is_public?: boolean;
    created_by?: string;
  }): Promise<CustomReportTemplate[]> {
    const response = await axios.get(`${API_BASE_URL}/custom-templates`, { params });
    return response.data;
  }

  /**
   * Get a specific custom template by ID
   */
  async getTemplate(templateId: number): Promise<CustomReportTemplate> {
    const response = await axios.get(`${API_BASE_URL}/custom-templates/${templateId}`);
    return response.data;
  }

  /**
   * Update an existing custom template
   */
  async updateTemplate(templateId: number, updates: CustomTemplateUpdate): Promise<CustomReportTemplate> {
    const response = await axios.patch(`${API_BASE_URL}/custom-templates/${templateId}`, updates);
    return response.data;
  }

  /**
   * Delete a custom template
   */
  async deleteTemplate(templateId: number): Promise<void> {
    await axios.delete(`${API_BASE_URL}/custom-templates/${templateId}`);
  }

  /**
   * Duplicate an existing template
   */
  async duplicateTemplate(templateId: number, newName?: string): Promise<CustomReportTemplate> {
    const response = await axios.post(
      `${API_BASE_URL}/custom-templates/${templateId}/duplicate`,
      null,
      { params: { new_name: newName } }
    );
    return response.data;
  }

  /**
   * Parse template JSON string to object
   */
  parseTemplateJSON(jsonString: string): CustomTemplateJSON {
    return JSON.parse(jsonString);
  }

  /**
   * Convert template object to JSON string
   */
  stringifyTemplateJSON(template: CustomTemplateJSON): string {
    return JSON.stringify(template, null, 2);
  }

  /**
   * Create a default empty template structure
   */
  createDefaultTemplate(): CustomTemplateJSON {
    return {
      sections: [
        {
          type: 'text',
          title: 'Introduction',
          content: 'Enter your report introduction here...'
        }
      ],
      layout: {
        page_size: 'letter',
        orientation: 'portrait',
        margins: {
          top: 1,
          bottom: 1,
          left: 1,
          right: 1
        }
      }
    };
  }

  /**
   * Validate template JSON structure
   */
  validateTemplateJSON(jsonString: string): { valid: boolean; error?: string } {
    try {
      const template = JSON.parse(jsonString);
      
      if (!template.sections || !Array.isArray(template.sections)) {
        return { valid: false, error: 'Template must contain a sections array' };
      }

      if (template.sections.length === 0) {
        return { valid: false, error: 'Template must have at least one section' };
      }

      for (const section of template.sections) {
        if (!section.type || !section.title) {
          return { valid: false, error: 'Each section must have type and title' };
        }

        const validTypes = ['text', 'table', 'chart', 'metrics', 'findings'];
        if (!validTypes.includes(section.type)) {
          return { valid: false, error: `Invalid section type: ${section.type}` };
        }
      }

      if (!template.layout) {
        return { valid: false, error: 'Template must contain layout settings' };
      }

      return { valid: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { valid: false, error: `Invalid JSON: ${message}` };
    }
  }
}

export default new CustomTemplateService();
