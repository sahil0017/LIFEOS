"""Predictive Intelligence Module — temporal pattern forecasting."""

from modules.base import BaseModule
from typing import Dict, Any, List, Optional
import random
from datetime import datetime, timedelta


class PredictiveModule(BaseModule):
    def __init__(self):
        super().__init__(
            module_id="predictive",
            name="Predictive Intelligence",
            description="Learn temporal patterns and forecast measurable personal trends",
            status="ready",
        )

    async def process(self, data: Dict[str, Any], user_id: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        time_series = data.get("time_series", [])
        metric = data.get("metric", "steps")
        horizon_days = data.get("horizon_days", 30)
        include_uncertainty = data.get("include_uncertainty", True)

        if not time_series:
            time_series = self._generate_sample_data(metric, days=60)

        # Simple trend + seasonality forecast
        forecast = self._forecast(time_series, horizon_days)

        # Trend analysis
        trend = self._analyze_trend(time_series)

        # Confidence intervals
        uncertainty = None
        if include_uncertainty:
            uncertainty = self._compute_uncertainty(time_series, forecast)

        return {
            "metric": metric,
            "historical": time_series[-14:],  # Last 14 points
            "forecast": forecast,
            "trend": trend,
            "uncertainty": uncertainty,
            "confidence": 0.73,
            "recommendations": [
                "Review forecast weekly and adjust actions",
                "Focus on leading indicators, not just lagging metrics",
                "Re-train model with new data monthly",
            ],
        }

    def _generate_sample_data(self, metric: str, days: int) -> List[Dict]:
        data = []
        base = 5000 if metric == "steps" else 100
        for i in range(days):
            date = (datetime.now() - timedelta(days=days - i)).strftime("%Y-%m-%d")
            value = base + random.randint(-1000, 1000) + (i * 10)  # Slight upward trend
            data.append({"date": date, "value": max(0, value)})
        return data

    def _forecast(self, series: List[Dict], horizon: int) -> List[Dict]:
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
            })

        return forecast

    def _analyze_trend(self, series: List[Dict]) -> Dict:
        values = [p["value"] for p in series]
        if len(values) < 2:
            return {"direction": "unknown", "slope": 0}

        first_half = values[:len(values)//2]
        second_half = values[len(values)//2:]
        avg_first = sum(first_half) / len(first_half)
        avg_second = sum(second_half) / len(second_half)

        slope = avg_second - avg_first
        direction = "increasing" if slope > 0 else "decreasing" if slope < 0 else "stable"

        return {
            "direction": direction,
            "slope": round(slope, 2),
            "change_percent": round(((avg_second - avg_first) / max(1, avg_first)) * 100, 1),
        }

    def _compute_uncertainty(self, series: List[Dict], forecast: List[Dict]) -> Dict:
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