"""Jira integration for VulnManager."""

import os
import logging
from typing import Optional, Dict, Any
import httpx
from cryptography.fernet import Fernet
import base64
from sqlmodel import Session, select
from app.models import Finding, JiraSettings

logger = logging.getLogger(__name__)

# Encryption key for API tokens (should be stored in environment variable)
# Generate with: Fernet.generate_key()
ENCRYPTION_KEY = os.getenv("JIRA_ENCRYPTION_KEY", Fernet.generate_key())
if isinstance(ENCRYPTION_KEY, str):
    ENCRYPTION_KEY = ENCRYPTION_KEY.encode()
cipher_suite = Fernet(ENCRYPTION_KEY)


def encrypt_token(token: str) -> str:
    """Encrypt a Jira API token."""
    return cipher_suite.encrypt(token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    """Decrypt a Jira API token."""
    return cipher_suite.decrypt(encrypted_token.encode()).decode()


class JiraClient:
    """Client for interacting with Jira API."""
    
    def __init__(self, jira_url: str, email: str, api_token: str):
        """
        Initialize Jira client.
        
        Args:
            jira_url: Base URL of Jira instance (e.g., https://your-domain.atlassian.net)
            email: User email for authentication
            api_token: Jira API token
        """
        self.jira_url = jira_url.rstrip('/')
        self.email = email
        self.api_token = api_token
        self.auth = (email, api_token)
        
    async def test_connection(self) -> Dict[str, Any]:
        """
        Test the Jira connection.
        
        Returns:
            Dictionary with connection status
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.jira_url}/rest/api/3/myself",
                    auth=self.auth,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    user_data = response.json()
                    return {
                        "success": True,
                        "message": "Connection successful",
                        "user": user_data.get("displayName", "Unknown")
                    }
                else:
                    return {
                        "success": False,
                        "message": f"Connection failed with status {response.status_code}",
                        "error": response.text
                    }
        except Exception as e:
            logger.error(f"Jira connection test failed: {e}")
            return {
                "success": False,
                "message": "Connection failed",
                "error": str(e)
            }
    
    async def create_issue(
        self,
        project_key: str,
        finding: Finding,
        issue_type: str = "Bug"
    ) -> Optional[Dict[str, Any]]:
        """
        Create a Jira issue from a finding.
        
        Args:
            project_key: Jira project key
            finding: The finding to create an issue for
            issue_type: Type of Jira issue (default: Bug)
            
        Returns:
            Dictionary with issue data if successful, None otherwise
        """
        # Map risk rating to Jira priority
        priority_mapping = {
            "Critical": "Highest",
            "High": "High",
            "Medium": "Medium",
            "Low": "Low",
            "Informational": "Lowest"
        }
        
        issue_data = {
            "fields": {
                "project": {"key": project_key},
                "summary": finding.title,
                "description": {
                    "type": "doc",
                    "version": 1,
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [
                                {
                                    "type": "text",
                                    "text": f"Description:\n{finding.description}"
                                }
                            ]
                        },
                        {
                            "type": "paragraph",
                            "content": [
                                {
                                    "type": "text",
                                    "text": f"\n\nRemediation:\n{finding.remediation}"
                                }
                            ]
                        },
                        {
                            "type": "paragraph",
                            "content": [
                                {
                                    "type": "text",
                                    "text": f"\n\nRisk Rating: {finding.risk_rating.value}"
                                }
                            ]
                        }
                    ]
                },
                "issuetype": {"name": issue_type},
                "priority": {"name": priority_mapping.get(finding.risk_rating.value, "Medium")}
            }
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.jira_url}/rest/api/3/issue",
                    json=issue_data,
                    auth=self.auth,
                    headers={"Content-Type": "application/json"},
                    timeout=30.0
                )
                
                if response.status_code == 201:
                    issue = response.json()
                    logger.info(f"Created Jira issue {issue['key']} for finding {finding.id}")
                    return {
                        "key": issue["key"],
                        "id": issue["id"],
                        "self": issue["self"]
                    }
                else:
                    logger.error(f"Failed to create Jira issue: {response.status_code} - {response.text}")
                    return None
        except Exception as e:
            logger.error(f"Error creating Jira issue: {e}")
            return None
    
    async def get_issue(self, issue_key: str) -> Optional[Dict[str, Any]]:
        """
        Get a Jira issue by key.
        
        Args:
            issue_key: The Jira issue key (e.g., PROJ-123)
            
        Returns:
            Dictionary with issue data if successful, None otherwise
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.jira_url}/rest/api/3/issue/{issue_key}",
                    auth=self.auth,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Failed to get Jira issue: {response.status_code}")
                    return None
        except Exception as e:
            logger.error(f"Error getting Jira issue: {e}")
            return None
    
    async def update_issue_status(self, issue_key: str, status: str) -> bool:
        """
        Update the status of a Jira issue.
        
        Args:
            issue_key: The Jira issue key
            status: New status
            
        Returns:
            True if successful, False otherwise
        """
        # Note: Jira uses transitions, not direct status updates
        # This is a simplified version - in production, you'd need to:
        # 1. Get available transitions for the issue
        # 2. Find the transition ID that leads to the desired status
        # 3. Execute that transition
        
        try:
            # Get available transitions
            async with httpx.AsyncClient() as client:
                transitions_response = await client.get(
                    f"{self.jira_url}/rest/api/3/issue/{issue_key}/transitions",
                    auth=self.auth,
                    timeout=10.0
                )
                
                if transitions_response.status_code != 200:
                    logger.error(f"Failed to get transitions: {transitions_response.status_code}")
                    return False
                
                transitions = transitions_response.json().get("transitions", [])
                
                # Find transition matching the status
                transition_id = None
                for t in transitions:
                    if t["to"]["name"].lower() == status.lower():
                        transition_id = t["id"]
                        break
                
                if not transition_id:
                    logger.warning(f"No transition found for status '{status}'")
                    return False
                
                # Execute transition
                transition_response = await client.post(
                    f"{self.jira_url}/rest/api/3/issue/{issue_key}/transitions",
                    json={"transition": {"id": transition_id}},
                    auth=self.auth,
                    headers={"Content-Type": "application/json"},
                    timeout=10.0
                )
                
                return transition_response.status_code == 204
        except Exception as e:
            logger.error(f"Error updating Jira issue status: {e}")
            return False


def get_jira_client(session: Session, project_id: Optional[int] = None) -> Optional[JiraClient]:
    """
    Get a Jira client for a project.
    
    Args:
        session: Database session
        project_id: Project ID (if None, gets global settings)
        
    Returns:
        JiraClient if settings exist, None otherwise
    """
    statement = select(JiraSettings).where(
        JiraSettings.is_active == True,
        JiraSettings.project_id == project_id
    )
    
    settings = session.exec(statement).first()
    
    if not settings or not settings.api_token_encrypted:
        logger.warning(f"No active Jira settings found for project {project_id}")
        return None
    
    try:
        api_token = decrypt_token(settings.api_token_encrypted)
        # Email should be stored separately or derived from settings
        # For now, we'll require it to be set in environment
        email = os.getenv("JIRA_USER_EMAIL", "")
        
        if not email:
            logger.error("JIRA_USER_EMAIL environment variable not set")
            return None
        
        return JiraClient(settings.jira_url, email, api_token)
    except Exception as e:
        logger.error(f"Error creating Jira client: {e}")
        return None
