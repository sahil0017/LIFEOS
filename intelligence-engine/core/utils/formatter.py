"""Response formatting utilities for Intelligence Engine."""

from typing import Dict, Any, List, Optional, Union
import json
from datetime import datetime


class ResponseFormatter:
    """Helper class for formatting API responses."""
    
    @staticmethod
    def format_success(
        data: Dict[str, Any],
        message: str = "Success",
        status: str = "ok"
    ) -> Dict[str, Any]:
        """Format a success response."""
        return {
            "status": status,
            "message": message,
            "data": data,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    
    @staticmethod
    def format_error(
        error: str,
        code: int = 500,
        details: Dict[str, Any] = None,
        status: str = "error"
    ) -> Dict[str, Any]:
        """Format an error response."""
        return {
            "status": status,
            "error": error,
            "code": code,
            "details": details or {},
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    
    @staticmethod
    def format_module_result(
        module_id: str,
        result: Dict[str, Any],
        execution_time_ms: float = 0.0,
        confidence: float = 0.5,
        recommendations: List[str] = None,
        related_modules: List[str] = None,
        execution_id: str = None
    ) -> Dict[str, Any]:
        """Format a module execution result."""
        return {
            "module": module_id,
            "result": result,
            "confidence": confidence,
            "execution_time_ms": execution_time_ms,
            "recommendations": recommendations or [],
            "related_modules": related_modules or [],
            "execution_id": execution_id or "",
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    
    @staticmethod
    def format_cross_module_result(
        execution_id: str,
        problem_type: str,
        modules_run: List[str],
        synthesis: Dict[str, Any],
        total_execution_time_ms: float = 0.0,
        confidence: float = 0.5
    ) -> Dict[str, Any]:
        """Format a cross-module execution result."""
        return {
            "execution_id": execution_id,
            "problem_type": problem_type,
            "modules_run": modules_run,
            "synthesis": synthesis,
            "total_execution_time_ms": total_execution_time_ms,
            "confidence": confidence,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    
    @staticmethod
    def format_visualization(
        problem_type: str,
        user_id: str,
        chart_data: Dict[str, Any],
        module_graph: Dict[str, Any],
        insights: List[str],
        recommendations: List[str]
    ) -> Dict[str, Any]:
        """Format a visualization result."""
        return {
            "problem_type": problem_type,
            "user_id": user_id,
            "chart_data": chart_data,
            "module_graph": module_graph,
            "insights": insights,
            "recommendations": recommendations,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    
    @staticmethod
    def format_ai_response(
        content: str,
        model: str,
        finish_reason: str = "stop",
        usage: Dict[str, int] = None,
        is_fallback: bool = False
    ) -> Dict[str, Any]:
        """Format an AI response."""
        return {
            "content": content,
            "model": model,
            "finish_reason": finish_reason,
            "usage": usage or {},
            "is_fallback": is_fallback,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    
    @staticmethod
    def format_list_response(
        items: List[Dict[str, Any]],
        total: int = None,
        offset: int = 0,
        limit: int = None
    ) -> Dict[str, Any]:
        """Format a list response with pagination."""
        total = total or len(items)
        return {
            "items": items,
            "total": total,
            "offset": offset,
            "limit": limit,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    
    @staticmethod
    def format_health_check(
        status: str = "ok",
        modules: List[str] = None,
        version: str = "1.0.0"
    ) -> Dict[str, Any]:
        """Format a health check response."""
        return {
            "status": status,
            "modules": modules or [],
            "version": version,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    
    @staticmethod
    def truncate_text(text: str, max_length: int = 1000) -> str:
        """Truncate text to a maximum length."""
        if not text:
            return ""
        if len(text) <= max_length:
            return text
        return text[:max_length] + "..."
    
    @staticmethod
    def truncate_dict(data: Dict[str, Any], max_depth: int = 5, max_length: int = 10000) -> Dict[str, Any]:
        """Truncate a dict to prevent excessive size."""
        if max_depth <= 0 or max_length <= 0:
            return {"_truncated": True}
        
        result = {}
        current_length = 0
        for key, value in data.items():
            if current_length >= max_length:
                result["_truncated"] = True
                break
            
            if isinstance(value, dict):
                result[key] = ResponseFormatter.truncate_dict(
                    value, max_depth - 1, max_length - current_length
                )
                current_length += len(json.dumps(result[key]))
            elif isinstance(value, list):
                result[key] = [
                    ResponseFormatter.truncate_dict(item, max_depth - 1, max_length - current_length)
                    if isinstance(item, dict) else item
                    for item in value[:100]  # Limit list size
                ]
                current_length += len(json.dumps(result[key]))
            else:
                result[key] = value
                current_length += len(json.dumps(value))
        
        return result
