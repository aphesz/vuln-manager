import { useState, useEffect } from 'react';

export type SidebarState = 'expanded' | 'collapsed' | 'hidden';

/**
 * Custom hook for managing sidebar state (expanded/collapsed/hidden)
 * Persists state to localStorage for user preference
 * 
 * @returns {object} Object containing sidebar state and control functions
 */
export const useSidebarState = () => {
  // Initialize state from localStorage or default to 'expanded'
  const [state, setState] = useState<SidebarState>(() => {
    try {
      const saved = localStorage.getItem('sidebar_state');
      return (saved as SidebarState) || 'expanded';
    } catch (error) {
      console.error('Error reading sidebar state from localStorage:', error);
      return 'expanded';
    }
  });

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('sidebar_state', state);
    } catch (error) {
      console.error('Error saving sidebar state to localStorage:', error);
    }
  }, [state]);

  /**
   * Toggle sidebar: expanded -> collapsed -> hidden -> expanded
   */
  const toggle = () => {
    setState((prev) => {
      if (prev === 'expanded') return 'collapsed';
      if (prev === 'collapsed') return 'hidden';
      return 'expanded';
    });
  };

  /**
   * Set sidebar to collapsed state (64px icons only)
   */
  const collapse = () => {
    setState('collapsed');
  };

  /**
   * Set sidebar to expanded state (280px with labels)
   */
  const expand = () => {
    setState('expanded');
  };

  /**
   * Set sidebar to hidden state (completely hidden)
   */
  const hide = () => {
    setState('hidden');
  };

  return {
    state,
    isExpanded: state === 'expanded',
    isCollapsed: state === 'collapsed',
    isHidden: state === 'hidden',
    toggle,
    collapse,
    expand,
    hide,
  };
};
