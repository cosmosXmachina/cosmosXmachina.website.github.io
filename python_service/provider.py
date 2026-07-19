from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ProviderResult:
    output: dict[str, Any]
    evidence: list[dict[str, Any]]
    usage: dict[str, int | float]
    trace: dict[str, Any]
    warnings: list[str]


class FixtureAIProvider:
    version = "fixtures-2026.1"

    async def execute(
        self,
        *,
        task: str,
        schema: dict[str, Any],
        context: dict[str, Any],
        input: dict[str, Any],
    ) -> ProviderResult:
        output, evidence = self._fixture(task, input, context)
        return ProviderResult(
            output=output,
            evidence=evidence,
            usage={
                "inputUnits": len(str(input)),
                "outputUnits": len(str(output)),
                "estimatedCost": 0,
            },
            trace={
                "provider": "fixture",
                "providerVersion": self.version,
                "task": task,
                "schemaId": schema.get("id"),
                "contextId": context.get("demo"),
                "deterministic": True,
            },
            warnings=[
                "Synthetic demonstration: no external AI provider was called."
            ],
        )

    def _fixture(
        self,
        task: str,
        input_data: dict[str, Any],
        context: dict[str, Any],
    ) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        if task == "document_classify":
            return (
                {
                    "category": "purchase_order",
                    "priority": "high",
                    "fields": {
                        "orderReference": "NW-8841",
                        "requestedDate": "2026-08-03",
                        "total": 4820,
                        "currency": "EUR",
                    },
                },
                [
                    {
                        "source": "email",
                        "excerpt": "Please confirm order NW-8841 for EUR 4,820.",
                    },
                    {
                        "source": "attachment",
                        "excerpt": "Requested delivery: 03/08/2026",
                    },
                ],
            )
        if task == "knowledge_search":
            evidence = list(context.get("retrievalEvidence") or [])
            if not evidence:
                return (
                    {
                        "answer": None,
                        "confidence": 0,
                        "abstained": True,
                        "reason": "No permitted evidence supports this answer.",
                    },
                    evidence,
                )
            return (
                {
                    "answer": (
                        "Gold customers may request an expedited replacement "
                        "after serial-number validation."
                    ),
                    "confidence": 0.91,
                    "abstained": False,
                },
                evidence,
            )
        if task == "catalog_enrich":
            return (
                {
                    "title": "Orion S7 IP67 Field Sensor",
                    "bullets": [
                        "IP67 enclosure",
                        "Modbus RTU",
                        "Replaceable M12 connector",
                    ],
                    "channelStatus": "ready_for_review",
                },
                [
                    {"source": "PIM OR-S7", "field": "technical_attributes"},
                    {"source": "Channel rules 2026.2", "field": "title_and_bullets"},
                ],
            )
        return ({"status": "completed", "acceptedInputKeys": sorted(input_data)}, [])
