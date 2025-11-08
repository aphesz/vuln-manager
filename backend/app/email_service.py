# backend/app/email_service.py
"""
Email Integration Service
Handles SMTP configuration, email delivery, and report attachments.
"""

import smtplib
import ssl
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import List, Optional
import logging

from sqlmodel import Session, select
from app.models import EmailSettings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails with attachments via SMTP."""
    
    def __init__(self, session: Session):
        self.session = session
        self.settings = self._get_active_settings()
    
    def _get_active_settings(self) -> Optional[EmailSettings]:
        """Get active email settings from database."""
        return self.session.exec(
            select(EmailSettings).where(EmailSettings.is_active == True)
        ).first()
    
    def send_report(
        self,
        to_emails: List[str],
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
        attachment_paths: List[str] = None,
        cc_emails: List[str] = None,
        bcc_emails: List[str] = None
    ) -> bool:
        """
        Send email with report attachments.
        
        Args:
            to_emails: List of recipient email addresses
            subject: Email subject line
            body_text: Plain text email body
            body_html: Optional HTML email body
            attachment_paths: List of file paths to attach
            cc_emails: Optional CC recipients
            bcc_emails: Optional BCC recipients
        
        Returns:
            True if sent successfully, False otherwise
        """
        if not self.settings:
            logger.error("No active email settings configured")
            return False
        
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["From"] = f"{self.settings.from_name} <{self.settings.from_email}>" if self.settings.from_name else self.settings.from_email
            message["To"] = ", ".join(to_emails)
            message["Subject"] = subject
            
            if cc_emails:
                message["Cc"] = ", ".join(cc_emails)
            if bcc_emails:
                message["Bcc"] = ", ".join(bcc_emails)
            
            # Add body
            text_part = MIMEText(body_text, "plain")
            message.attach(text_part)
            
            if body_html:
                html_part = MIMEText(body_html, "html")
                message.attach(html_part)
            
            # Add attachments
            if attachment_paths:
                for file_path in attachment_paths:
                    if not Path(file_path).exists():
                        logger.warning(f"Attachment not found: {file_path}")
                        continue
                    
                    with open(file_path, "rb") as attachment:
                        part = MIMEBase("application", "octet-stream")
                        part.set_payload(attachment.read())
                    
                    encoders.encode_base64(part)
                    
                    filename = Path(file_path).name
                    part.add_header(
                        "Content-Disposition",
                        f"attachment; filename= {filename}",
                    )
                    
                    message.attach(part)
            
            # Send email
            all_recipients = to_emails + (cc_emails or []) + (bcc_emails or [])
            
            if self.settings.smtp_use_ssl:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(
                    self.settings.smtp_host, 
                    self.settings.smtp_port, 
                    context=context
                ) as server:
                    if self.settings.smtp_username and self.settings.smtp_password:
                        server.login(self.settings.smtp_username, self.settings.smtp_password)
                    server.sendmail(self.settings.from_email, all_recipients, message.as_string())
            else:
                with smtplib.SMTP(self.settings.smtp_host, self.settings.smtp_port) as server:
                    if self.settings.smtp_use_tls:
                        context = ssl.create_default_context()
                        server.starttls(context=context)
                    if self.settings.smtp_username and self.settings.smtp_password:
                        server.login(self.settings.smtp_username, self.settings.smtp_password)
                    server.sendmail(self.settings.from_email, all_recipients, message.as_string())
            
            logger.info(f"Email sent successfully to {', '.join(to_emails)}")
            return True
        
        except smtplib.SMTPException as e:
            logger.error(f"SMTP error sending email: {e}")
            return False
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return False
    
    def test_connection(self) -> dict:
        """
        Test SMTP connection and authentication.
        
        Returns:
            Dict with success status and message
        """
        if not self.settings:
            return {
                "success": False,
                "message": "No active email settings configured"
            }
        
        try:
            if self.settings.smtp_use_ssl:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(
                    self.settings.smtp_host, 
                    self.settings.smtp_port, 
                    context=context,
                    timeout=10
                ) as server:
                    if self.settings.smtp_username and self.settings.smtp_password:
                        server.login(self.settings.smtp_username, self.settings.smtp_password)
                    return {
                        "success": True,
                        "message": f"Successfully connected to {self.settings.smtp_host}:{self.settings.smtp_port}"
                    }
            else:
                with smtplib.SMTP(self.settings.smtp_host, self.settings.smtp_port, timeout=10) as server:
                    if self.settings.smtp_use_tls:
                        context = ssl.create_default_context()
                        server.starttls(context=context)
                    if self.settings.smtp_username and self.settings.smtp_password:
                        server.login(self.settings.smtp_username, self.settings.smtp_password)
                    return {
                        "success": True,
                        "message": f"Successfully connected to {self.settings.smtp_host}:{self.settings.smtp_port}"
                    }
        
        except smtplib.SMTPAuthenticationError:
            return {
                "success": False,
                "message": "Authentication failed. Check username and password."
            }
        except smtplib.SMTPConnectError:
            return {
                "success": False,
                "message": f"Could not connect to {self.settings.smtp_host}:{self.settings.smtp_port}"
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Connection test failed: {str(e)}"
            }
    
    def generate_report_email_body(
        self,
        report_name: str,
        project_names: List[str],
        generated_by: str = "VulnManager"
    ) -> tuple[str, str]:
        """
        Generate professional email body for report delivery.
        
        Returns:
            Tuple of (plain_text, html)
        """
        project_list = ", ".join(project_names) if project_names else "All Projects"
        
        plain_text = f"""
Security Report Generated

Report: {report_name}
Projects: {project_list}
Generated by: {generated_by}

Please find the attached security assessment report. This document contains confidential information and should be handled according to your organization's security policies.

If you have any questions or need clarification on any findings, please contact your security team.

---
This is an automated message from VulnManager. Please do not reply to this email.
"""
        
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
        }}
        .header {{
            background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 5px 5px 0 0;
        }}
        .content {{
            background: #f9f9f9;
            padding: 30px;
            border: 1px solid #ddd;
            border-top: none;
        }}
        .info-box {{
            background: white;
            padding: 15px;
            margin: 15px 0;
            border-left: 4px solid #1976d2;
        }}
        .info-label {{
            font-weight: bold;
            color: #1976d2;
        }}
        .footer {{
            background: #333;
            color: #ccc;
            padding: 20px;
            text-align: center;
            font-size: 0.85em;
            border-radius: 0 0 5px 5px;
        }}
        .warning {{
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 10px;
            margin: 15px 0;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🛡️ Security Report Generated</h1>
    </div>
    
    <div class="content">
        <div class="info-box">
            <div><span class="info-label">Report:</span> {report_name}</div>
            <div><span class="info-label">Projects:</span> {project_list}</div>
            <div><span class="info-label">Generated by:</span> {generated_by}</div>
        </div>
        
        <p>Please find the attached security assessment report. This document contains confidential information and should be handled according to your organization's security policies.</p>
        
        <div class="warning">
            <strong>⚠️ Confidential:</strong> This report contains sensitive security information. Please ensure it is stored and transmitted securely.
        </div>
        
        <p>If you have any questions or need clarification on any findings, please contact your security team.</p>
    </div>
    
    <div class="footer">
        <p>This is an automated message from VulnManager.</p>
        <p>Please do not reply to this email.</p>
    </div>
</body>
</html>
"""
        
        return plain_text.strip(), html.strip()
