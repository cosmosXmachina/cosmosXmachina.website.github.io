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
                (
                    "Dimostrazione sintetica: non e stato contattato alcun provider AI esterno."
                    if input.get("language") == "it"
                    else "Synthetic demonstration: no external AI provider was called."
                )
            ],
        )

    def _fixture(
        self,
        task: str,
        input_data: dict[str, Any],
        context: dict[str, Any],
    ) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        italian = input_data.get("language") == "it"
        if task == "document_classify":
            fixtures = {
                "M-204": ("NW-8841", "2026-08-03", 4820, "high"),
                "M-205": ("AP-7712", "2026-08-12", 2430, "normal"),
                "M-206": ("AS-1907", "2026-08-06", 7350, "high"),
                "M-207": ("LC-5520", "2026-08-18", 1920, "normal"),
                "M-208": ("DA-4402", "", 5260, "high"),
                "M-209": ("VM-0088", "2026-08-25", 980, "normal"),
            }
            reference, requested_date, total, priority = fixtures.get(
                str(input_data.get("messageId", "M-204")), fixtures["M-204"]
            )
            checks = (
                [
                    "Riferimento ordine verificato",
                    "Totale e valuta presenti",
                    "Data di consegna normalizzata" if requested_date else "La data di consegna richiede una correzione umana",
                ]
                if italian
                else [
                    "Order reference matched",
                    "Total and currency present",
                    "Delivery date normalized" if requested_date else "Delivery date requires human correction",
                ]
            )
            return (
                {
                    "category": "purchase_order",
                    "priority": priority,
                    "fields": {
                        "orderReference": reference,
                        "requestedDate": requested_date,
                        "total": total,
                        "currency": "EUR",
                    },
                    "checks": checks,
                },
                [
                    {
                        "source": "email",
                        "excerpt": (f"L'ordine {reference} ha un totale di EUR {total}." if italian else f"Order {reference} totals EUR {total}."),
                    },
                    {
                        "source": "attachment",
                        "excerpt": (
                            (f"Data di consegna normalizzata: {requested_date}" if italian else f"Delivery date normalized: {requested_date}")
                            if requested_date
                            else ("La data di consegna non valida richiede una verifica" if italian else "Invalid delivery date requires review")
                        ),
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
                        "citations": [],
                        "abstained": True,
                        "reason": (
                            "Nessuna evidenza consentita supporta questa risposta."
                            if italian
                            else "No permitted evidence supports this answer."
                        ),
                    },
                    evidence,
                )
            return (
                {
                    "answer": (
                        "I clienti Gold possono richiedere una sostituzione accelerata dopo la verifica del numero di serie."
                        if italian
                        else "Gold customers may request an expedited replacement after serial-number validation."
                    ),
                    "confidence": 0.91,
                    "citations": [
                        f"{item['source']}, {item['section']}" for item in evidence
                    ],
                    "abstained": False,
                    "reason": None,
                },
                evidence,
            )
        return ({"status": "completed", "acceptedInputKeys": sorted(input_data)}, [])
