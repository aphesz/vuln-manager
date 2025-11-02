"""
Timezone utility functions for VulnManager.

Default timezone: GMT+8 (Malaysia Time - MYT)
All timestamps stored in database as timezone-aware UTC.
All timestamps displayed to users in their configured timezone.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

# Default timezone for the application
DEFAULT_TIMEZONE = "Asia/Kuala_Lumpur"  # GMT+8 (MYT)

# Common timezone mappings
TIMEZONE_CHOICES = {
    "Asia/Kuala_Lumpur": "GMT+8 (Malaysia Time)",
    "Asia/Singapore": "GMT+8 (Singapore Time)",
    "Asia/Manila": "GMT+8 (Philippines Time)",
    "Asia/Hong_Kong": "GMT+8 (Hong Kong Time)",
    "Asia/Shanghai": "GMT+8 (China Standard Time)",
    "Asia/Taipei": "GMT+8 (Taiwan Time)",
    "Asia/Jakarta": "GMT+7 (Western Indonesia Time)",
    "Asia/Bangkok": "GMT+7 (Indochina Time)",
    "Asia/Tokyo": "GMT+9 (Japan Standard Time)",
    "Asia/Seoul": "GMT+9 (Korea Standard Time)",
    "UTC": "UTC (Coordinated Universal Time)",
    "America/New_York": "GMT-5/-4 (Eastern Time)",
    "America/Los_Angeles": "GMT-8/-7 (Pacific Time)",
    "Europe/London": "GMT+0/+1 (British Time)",
    "Europe/Paris": "GMT+1/+2 (Central European Time)",
    "Australia/Sydney": "GMT+10/+11 (Australian Eastern Time)",
}


def get_current_time(tz: Optional[str] = None) -> datetime:
    """
    Get current time in the specified timezone.
    
    Args:
        tz: Timezone name (IANA format, e.g., 'Asia/Kuala_Lumpur')
            If None, uses DEFAULT_TIMEZONE
    
    Returns:
        Current datetime with timezone info
    """
    timezone_name = tz or DEFAULT_TIMEZONE
    try:
        user_tz = ZoneInfo(timezone_name)
        return datetime.now(user_tz)
    except Exception:
        # Fallback to UTC if timezone is invalid
        return datetime.now(timezone.utc)


def get_utc_now() -> datetime:
    """
    Get current time in UTC (for database storage).
    
    Returns:
        Current datetime in UTC with timezone info
    """
    return datetime.now(timezone.utc)


def convert_to_user_timezone(
    dt: datetime, 
    user_tz: Optional[str] = None
) -> datetime:
    """
    Convert a datetime to user's timezone.
    
    Args:
        dt: Datetime to convert (can be naive or aware)
        user_tz: Target timezone (defaults to DEFAULT_TIMEZONE)
    
    Returns:
        Datetime in user's timezone
    """
    timezone_name = user_tz or DEFAULT_TIMEZONE
    
    try:
        target_tz = ZoneInfo(timezone_name)
    except Exception:
        # Fallback to default timezone if invalid
        target_tz = ZoneInfo(DEFAULT_TIMEZONE)
    
    # If datetime is naive, assume it's UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    
    # Convert to target timezone
    return dt.astimezone(target_tz)


def convert_to_utc(dt: datetime) -> datetime:
    """
    Convert a datetime to UTC (for database storage).
    
    Args:
        dt: Datetime to convert (can be naive or aware)
    
    Returns:
        Datetime in UTC
    """
    # If datetime is naive, assume it's in DEFAULT_TIMEZONE
    if dt.tzinfo is None:
        default_tz = ZoneInfo(DEFAULT_TIMEZONE)
        dt = dt.replace(tzinfo=default_tz)
    
    # Convert to UTC
    return dt.astimezone(timezone.utc)


def format_datetime_for_display(
    dt: datetime,
    user_tz: Optional[str] = None,
    format_str: str = "%Y-%m-%d %H:%M:%S %Z"
) -> str:
    """
    Format a datetime for display to user in their timezone.
    
    Args:
        dt: Datetime to format
        user_tz: User's timezone (defaults to DEFAULT_TIMEZONE)
        format_str: strftime format string
    
    Returns:
        Formatted datetime string
    """
    user_dt = convert_to_user_timezone(dt, user_tz)
    return user_dt.strftime(format_str)


def parse_iso_datetime(iso_string: str, user_tz: Optional[str] = None) -> datetime:
    """
    Parse an ISO format datetime string to timezone-aware datetime.
    
    Args:
        iso_string: ISO format datetime string (e.g., '2025-11-02T10:30:00Z')
        user_tz: Timezone to assume if string has no timezone info
    
    Returns:
        Timezone-aware datetime in UTC
    """
    try:
        # Try parsing with timezone info
        dt = datetime.fromisoformat(iso_string.replace('Z', '+00:00'))
    except ValueError:
        # If no timezone info, assume user's timezone
        dt = datetime.fromisoformat(iso_string)
        if dt.tzinfo is None:
            timezone_name = user_tz or DEFAULT_TIMEZONE
            dt = dt.replace(tzinfo=ZoneInfo(timezone_name))
    
    # Always return in UTC for database storage
    return convert_to_utc(dt)


def get_timezone_offset(tz: Optional[str] = None) -> str:
    """
    Get the current UTC offset for a timezone.
    
    Args:
        tz: Timezone name (defaults to DEFAULT_TIMEZONE)
    
    Returns:
        Offset string (e.g., '+08:00')
    """
    timezone_name = tz or DEFAULT_TIMEZONE
    try:
        user_tz = ZoneInfo(timezone_name)
        now = datetime.now(user_tz)
        offset = now.strftime('%z')
        # Format as +HH:MM
        return f"{offset[:3]}:{offset[3:]}"
    except Exception:
        return '+00:00'


def is_valid_timezone(tz: str) -> bool:
    """
    Check if a timezone name is valid.
    
    Args:
        tz: Timezone name to validate
    
    Returns:
        True if valid, False otherwise
    """
    try:
        ZoneInfo(tz)
        return True
    except Exception:
        return False
