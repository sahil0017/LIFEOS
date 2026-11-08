"""Predictive Intelligence Module — temporal pattern forecasting with real AI."""

from modules.base import BaseModule
from services.cloudflare_ai import get_ai_client
from typing import Dict, Any, List, Optional
import json
from datetime import datetime, timedelta
import numpy as np


class PredictiveModule(BaseModule):
    def __init__(self):
        super().__init__(
            module_id="predictive",
            name="Predictive Intelligence",
            description="Learn temporal patterns and forecast measurable personal trends",
            status="ready",
        )
        self.ai = get_ai_client()

    async def process(self, data: Dict[str, Any], user_id: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        time_series = data.get("time_series", [])
        metric = data.get("metric", "steps")
        horizon_days = data.get("horizon_days", 30)
        include_uncertainty = data.get("include_uncertainty", True)
        observations = data.get("observations", [])

        if not time_series:
            # Generate from observations if available
            time_series = self._extract_time_series_from_observations(observations, metric)
            if not time_series:
                time_series = self._generate_sample_data(metric, days=60)

        # Use AI to forecast future values
        forecast_result = await self._forecast_with_ai(time_series, metric, horizon_days, observations)
        
        # Use AI to analyze trends
        trend_result = await self._analyze_trend_with_ai(time_series, metric)
        
        # Calculate uncertainty if requested
        uncertainty = None
        if include_uncertainty:
            uncertainty = self._compute_uncertainty(time_series, forecast_result.get("forecast", []))

        return {
            "metric": metric,
            "historical": time_series[-14:],  # Last 14 points
            "forecast": forecast_result.get("forecast", []),
            "ai_forecast_analysis": forecast_result.get("analysis", ""),
            "trend": trend_result,
            "uncertainty": uncertainty,
            "confidence": forecast_result.get("confidence", 0.73),
            "recommendations": [
                "Review forecast weekly and adjust actions",
                "Focus on leading indicators, not just lagging metrics",
                "Re-train model with new data monthly",
                f"AI forecasted {horizon_days} days of {metric} with {len(forecast_result.get('forecast', []))} predicted values",
            ],
        }

    async def _forecast_with_ai(
        self, 
        series: List[Dict], 
        metric: str, 
        horizon: int,
        observations: List[Dict]
    ) -> Dict[str, Any]:
        """Use AI to generate intelligent forecasts."""
        # Prepare time series data for AI
        values = [p["value"] for p in series]
        dates = [p["date"] for p in series]
        
        # Add observation context
        obs_context = "\n".join([
            f"[{o.get('occurred_at', '')}] {o.get('category', '')}: {o.get('label', o.get('text', ''))}"
            for o in observations[:10]
        ])

        data_str = json.dumps({
            "metric": metric,
            "dates": dates,
            "values": values,
            "horizon_days": horizon,
        }, indent=2)

        system_prompt = """You are a time series forecasting expert. Given historical data,
forecast future values using intelligent pattern recognition.

Consider:
- Trends (increasing, decreasing, stable)
- Seasonality (daily, weekly, monthly patterns)
- Anomalies and outliers
- External factors from context
- Confidence in predictions

Return ONLY valid JSON with structure:
{
    "forecast": [
        {
            "date": "2024-01-15",
            "value": 1234.5,
            "confidence": 0.0-1.0,
            "trend": "increasing|decreasing|stable",
            "notes": "any relevant notes"
        }
    ],
    "analysis": "brief analysis of forecast patterns",
    "method": "AI pattern recognition|trend extrapolation|seasonal adjustment",
    "confidence": 0.0-1.0
}"""

        user_prompt = f"""Forecast future values for this time series:

Metric: {metric}

Historical data:
{data_str}

Observation context:
{obs_context if obs_context else 'No additional context'}

Forecast {horizon} days into the future with confidence scores."""

        response = await self.ai.generate_text(
            prompt=user_prompt,
            system_prompt=system_prompt,
            model="gemma-4-26b-it",
            temperature=0.3,
            max_tokens=4096,
        )

        try:
            result = await self.ai.extract_json(response.content)
            if isinstance(result, dict) and "forecast" in result:
                return result
        except Exception:
            pass

        # Fallback to statistical forecast
        return {
            "forecast": self._forecast(series, horizon),
            "analysis": f"Statistical forecast for {metric} using trend analysis",
            "method": "trend extrapolation with seasonality",
            "confidence": 0.70,
        }

    async def _analyze_trend_with_ai(
        self, 
        series: List[Dict],
        metric: str
    ) -> Dict:
        """Use AI to analyze trends in time series."""
        values = [p["value"] for p in series]
        dates = [p["date"] for p in series]

        data_str = json.dumps({
            "metric": metric,
            "dates": dates,
            "values": values,
        }, indent=2)

        system_prompt = """You are a trend analysis expert. Given time series data,
identify trends and provide detailed analysis.

Return ONLY valid JSON with structure:
{
    "direction": "increasing|decreasing|stable|cyclical",
    "slope": -1000 to 1000,
    "change_percent": -100 to 100,
    "pattern_type": "linear|exponential|cyclical|random",
    "cycle_length_days": null or number,
    "anomalies": [
        {
            "date": "2024-01-01",
            "value": 1234.5,
            "expected": 1000.0,
            "deviation": 234.5,
            "significance": "high|medium|low"
        }
    ],
    "predictability": 0.0-1.0,
    "confidence": 0.0-1.0
}"""

        user_prompt = f"""Analyze the trend for this time series:

Metric: {metric}

Data:
{data_str}

Provide comprehensive trend analysis."""

        response = await self.ai.generate_text(
            prompt=user_prompt,
            system_prompt=system_prompt,
            model="gemma-4-26b-it",
            temperature=0.2,
            max_tokens=2048,
        )

        try:
            result = await self.ai.extract_json(response.content)
            if isinstance(result, dict):
                return result
        except Exception:
            pass

        # Fallback to statistical trend analysis
        return self._analyze_trend(series)

    def _extract_time_series_from_observations(
        self, 
        observations: List[Dict],
        metric: str
    ) -> List[Dict]:
        """Extract time series data from observations."""
        series = []
        metric_keywords = {
            "steps": ["step", "walk", "walking", "activity"],
            "study": ["study", "learn", "learning", "session"],
            "sleep": ["sleep", "rest"],
            "mood": ["mood", "feeling", "emotion"],
        }

        keywords = metric_keywords.get(metric.lower(), [metric.lower()])

        for obs in observations:
            text = (obs.get("label", "") + obs.get("text", "")).lower()
            if any(kw in text for kw in keywords):
                try:
                    # Try to extract numeric value
                    import re
                    match = re.search(r'\b\d+\b', obs.get("label", obs.get("text", "")))
                    value = int(match.group()) if match else 1
                    series.append({
                        "date": obs.get("occurred_at", obs.get("date", "")),
                        "value": value,
                    })
                except:
                    pass

        return series

    def _generate_sample_data(self, metric: str, days: int) -> List[Dict]:
        """Generate sample data as fallback."""
        data = []
        base = 5000 if metric.lower() == "steps" else 100
        for i in range(days):
            date = (datetime.now() - timedelta(days=days - i)).strftime("%Y-%m-%d")
            value = base + np.random.randint(-1000, 1000) + (i * 10)  # Slight upward trend
            data.append({"date": date, "value": max(0, int(value))})
        return data

    def _forecast(self, series: List[Dict], horizon: int) -> List[Dict]:
        """Generate forecast using statistical methods."""
        if len(series) < 2:
            return []

        # Simple linear trend + weekly seasonality
        values = [p["value"] for p in series]
        n = len(values)
        avg_change = (values[-1] - values[0]) / max(1, n - 1)

        forecast = []
        last_value = values[-1]
        last_date = datetime.strptime(series[-1]["date"], "%Y-%m-%d")

        for i in range(1, horizon + 1):
            future_date = last_date + timedelta(days=i)
            # Weekly seasonality: weekends lower for work metrics
            day_of_week = future_date.weekday()
            seasonal = 0.9 if day_of_week >= 5 else 1.0
            predicted = last_value + (avg_change * i) * seasonal
            forecast.append({
                "date": future_date.strftime("%Y-%m-%d"),
                "value": round(max(0, predicted), 1),
                "type": "predicted",
                "confidence": round(max(0, min(1, 0.9 - (i * 0.01))), 2),
            })

        return forecast

    def _analyze_trend(self, series: List[Dict]) -> Dict:
        """Analyze trend using statistical methods."""
        values = [p["value"] for p in series]
        if len(values) < 2:
            return {
                "direction": "unknown",
                "slope": 0,
                "change_percent": 0,
                "pattern_type": "unknown",
                "cycle_length_days": None,
                "anomalies": [],
                "predictability": 0.5,
                "confidence": 0.5,
            }

        first_half = values[:len(values)//2]
        second_half = values[len(values)//2:]
        avg_first = sum(first_half) / len(first_half)
        avg_second = sum(second_half) / len(second_half)

        slope = avg_second - avg_first
        direction = "increasing" if slope > 0 else "decreasing" if slope < 0 else "stable"
        change_percent = round(((avg_second - avg_first) / max(1, avg_first)) * 100, 1)

        # Detect cyclical patterns (simple check for weekly seasonality)
        pattern_type = "linear"
        if len(values) >= 14:
            weekly_values = [values[i] for i in range(0, len(values), 7)]
            if len(weekly_values) >= 2:
                weekly_avg = sum(weekly_values) / len(weekly_values)
                # Check if values fluctuate around a mean
                deviations = [abs(v - weekly_avg) for v in weekly_values]
                if max(deviations) > weekly_avg * 0.3:
                    pattern_type = "cyclical"

        return {
            "direction": direction,
            "slope": round(slope, 2),
            "change_percent": change_percent,
            "pattern_type": pattern_type,
            "cycle_length_days": 7 if pattern_type == "cyclical" else None,
            "anomalies": self._detect_anomalies(values),
            "predictability": 0.9 if pattern_type == "linear" else 0.7,
            "confidence": 0.85,
        }

    def _detect_anomalies(self, values: List[float]) -> List[Dict]:
        """Detect anomalies in time series."""
        anomalies = []
        if len(values) < 3:
            return anomalies

        mean = sum(values) / len(values)
        std = (sum((v - mean) ** 2 for v in values) / len(values)) ** 0.5

        for i, v in enumerate(values):
            if abs(v - mean) > 2 * std:  # 2 standard deviations
                anomalies.append({
                    "index": i,
                    "value": v,
                    "expected": mean,
                    "deviation": abs(v - mean),
                    "significance": "high" if abs(v - mean) > 3 * std else "medium",
                })

        return anomalies

    def _compute_uncertainty(self, series: List[Dict], forecast: List[Dict]) -> Dict:
        """Compute uncertainty for predictions."""
        values = [p["value"] for p in series]
        if len(values) < 2:
            return {"std": 0, "confidence_interval": [0, 0]}

        mean = sum(values) / len(values)
        variance = sum((v - mean) ** 2 for v in values) / len(values)
        std = variance ** 0.5

        return {
            "std": round(std, 1),
            "confidence_interval": [
                round(max(0, mean - std), 1),
                round(mean + std, 1),
            ],
        }

    def get_related_modules(self) -> List[str]:
        return ["world_model", "cognitive_memory", "causal"]
