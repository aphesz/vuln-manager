/**
 * MITRE ATT&CK Technique Service
 * 
 * API client for managing MITRE ATT&CK technique data and mappings.
 * Provides methods to fetch, search, and map techniques to vulnerabilities.
 */

import axios from 'axios';

const API_BASE_URL = '/api';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/**
 * MITRE ATT&CK Technique
 */
export interface AttackTechnique {
  technique_id: string;        // e.g., "T1190", "T1059.001"
  technique_name: string;       // e.g., "Exploit Public-Facing Application"
  tactic: string;               // e.g., "Initial Access", "Execution"
  description: string;          // Full description of the technique
  keywords: string[];           // Keyword tags for searching
  relevance_score?: number;     // Only present in suggestion responses
  matched_keywords?: string[];  // Only present in suggestion responses
}

/**
 * Response from GET /attack/techniques
 */
export interface AttackTechniquesResponse {
  count: number;
  techniques: AttackTechnique[];
}

/**
 * Response from POST /vulnerability-templates/{id}/suggest-attack
 */
export interface AttackSuggestionsResponse {
  template_id: number;
  template_title: string;
  suggestion_count: number;
  suggestions: AttackTechnique[];  // Includes relevance_score and matched_keywords
}

/**
 * Grouped techniques by tactic
 */
export interface TechniquesByTactic {
  [tactic: string]: AttackTechnique[];
}

/**
 * Tactic statistics
 */
export interface TacticStats {
  tactic: string;
  technique_count: number;
  finding_count?: number;  // Optional: count of findings using this tactic
}

// ============================================================================
// Service Class
// ============================================================================

class AttackTechniqueService {
  /**
   * Get all available MITRE ATT&CK techniques
   * 
   * @returns All 23 curated techniques from the backend
   */
  async getAllTechniques(): Promise<AttackTechnique[]> {
    try {
      const response = await axios.get<AttackTechniquesResponse>(
        `${API_BASE_URL}/attack/techniques`
      );
      return response.data.techniques;
    } catch (error) {
      console.error('Error fetching ATT&CK techniques:', error);
      throw error;
    }
  }

  /**
   * Search techniques by keyword
   * 
   * @param query - Search string (technique ID, name, tactic, keyword)
   * @returns Matching techniques
   */
  async searchTechniques(query: string): Promise<AttackTechnique[]> {
    try {
      const response = await axios.get<AttackTechniquesResponse>(
        `${API_BASE_URL}/attack/techniques`,
        { params: { query } }
      );
      return response.data.techniques;
    } catch (error) {
      console.error('Error searching ATT&CK techniques:', error);
      throw error;
    }
  }

  /**
   * Get suggested techniques for a vulnerability template
   * 
   * @param templateId - Template ID to analyze
   * @returns Suggested techniques with relevance scores
   */
  async suggestTechniques(templateId: number): Promise<AttackSuggestionsResponse> {
    try {
      const response = await axios.post<AttackSuggestionsResponse>(
        `${API_BASE_URL}/vulnerability-templates/${templateId}/suggest-attack`
      );
      return response.data;
    } catch (error) {
      console.error('Error getting technique suggestions:', error);
      throw error;
    }
  }

  /**
   * Update ATT&CK technique mappings for a template
   * 
   * @param templateId - Template ID to update
   * @param techniqueIds - Array of technique IDs (e.g., ["T1190", "T1059"])
   * @returns Updated template data
   */
  async updateTechniques(templateId: number, techniqueIds: string[]): Promise<any> {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/vulnerability-templates/${templateId}/attack-techniques`,
        techniqueIds,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating ATT&CK techniques:', error);
      throw error;
    }
  }

  /**
   * Group techniques by tactic
   * 
   * @param techniques - Array of techniques
   * @returns Techniques grouped by tactic name
   */
  groupByTactic(techniques: AttackTechnique[]): TechniquesByTactic {
    const grouped: TechniquesByTactic = {};
    
    techniques.forEach(technique => {
      const tactic = technique.tactic;
      if (!grouped[tactic]) {
        grouped[tactic] = [];
      }
      grouped[tactic].push(technique);
    });
    
    return grouped;
  }

  /**
   * Get tactic statistics
   * 
   * @param techniques - Array of techniques
   * @returns Array of tactic stats with counts
   */
  getTacticStats(techniques: AttackTechnique[]): TacticStats[] {
    const grouped = this.groupByTactic(techniques);
    
    return Object.entries(grouped).map(([tactic, techs]) => ({
      tactic,
      technique_count: techs.length
    })).sort((a, b) => b.technique_count - a.technique_count);
  }

  /**
   * Get the standard ATT&CK tactic order (kill chain order)
   * 
   * @returns Array of tactic names in proper sequence
   */
  getTacticOrder(): string[] {
    return [
      'Initial Access',
      'Execution',
      'Persistence',
      'Privilege Escalation',
      'Defense Evasion',
      'Credential Access',
      'Discovery',
      'Lateral Movement',
      'Collection',
      'Exfiltration',
      'Impact'
    ];
  }

  /**
   * Sort techniques by tactic (kill chain order)
   * 
   * @param techniques - Array of techniques
   * @returns Techniques sorted by tactic order
   */
  sortByTacticOrder(techniques: AttackTechnique[]): AttackTechnique[] {
    const tacticOrder = this.getTacticOrder();
    const tacticRank = new Map(tacticOrder.map((t, i) => [t, i]));
    
    return [...techniques].sort((a, b) => {
      const rankA = tacticRank.get(a.tactic) ?? 999;
      const rankB = tacticRank.get(b.tactic) ?? 999;
      
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      
      // Secondary sort by technique ID
      return a.technique_id.localeCompare(b.technique_id);
    });
  }

  /**
   * Parse attack_techniques JSON from Finding or Template
   * 
   * @param jsonString - JSON string from database
   * @returns Array of parsed techniques
   */
  parseTechniquesFromJSON(jsonString: string | null): AttackTechnique[] {
    if (!jsonString) {
      return [];
    }
    
    try {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error parsing attack techniques JSON:', error);
      return [];
    }
  }

  /**
   * Get color for tactic (for visualization)
   * 
   * @param tactic - Tactic name
   * @returns Hex color code
   */
  getTacticColor(tactic: string): string {
    const colors: { [key: string]: string } = {
      'Initial Access': '#FF6B6B',
      'Execution': '#FFA500',
      'Persistence': '#FFD700',
      'Privilege Escalation': '#90EE90',
      'Defense Evasion': '#87CEEB',
      'Credential Access': '#9370DB',
      'Discovery': '#DDA0DD',
      'Lateral Movement': '#F08080',
      'Collection': '#FFB6C1',
      'Exfiltration': '#FF69B4',
      'Impact': '#DC143C'
    };
    
    return colors[tactic] || '#808080';
  }
}

// Export singleton instance
export default new AttackTechniqueService();
