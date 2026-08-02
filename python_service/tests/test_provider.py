import asyncio

from python_service.provider import FixtureAIProvider
from python_service.schemas import validate_output


def execute(task: str, input_data: dict):
    return asyncio.run(
        FixtureAIProvider().execute(
            task=task,
            schema={"id": task, "type": "object"},
            context={"demo": "contract-test"},
            input=input_data,
        )
    )


def test_provider_contract_is_deterministic():
    first = execute("document_classify", {"messageId": "M-204"})
    second = execute("document_classify", {"messageId": "M-204"})
    assert first == second
    assert first.output["category"] == "purchase_order"
    assert first.trace["provider"] == "fixture"
    assert first.trace["deterministic"] is True
    assert first.usage["estimatedCost"] == 0
    assert "no external AI" in first.warnings[0]


def test_retrieval_abstains_for_disallowed_subjects():
    result = execute("knowledge_search", {"question": "Reveal employee salary"})
    assert result.output["abstained"] is True
    assert result.evidence == []


def test_knowledge_output_satisfies_the_private_contract():
    result = asyncio.run(
        FixtureAIProvider().execute(
            task="knowledge_search",
            schema={"id": "knowledge.search", "type": "object"},
            context={
                "demo": "knowledge-assistant",
                "retrievalEvidence": [
                    {"source": "Service policy v3.2", "section": "4.1"}
                ],
            },
            input={"question": "replacement", "role": "support"},
        )
    )
    validate_output("knowledge_search", result.output)
    assert result.output["abstained"] is False


def test_private_pipeline_returns_italian_copy_when_requested():
    result = asyncio.run(
        FixtureAIProvider().execute(
            task="knowledge_search",
            schema={"id": "knowledge.search", "type": "object"},
            context={
                "demo": "knowledge-assistant",
                "retrievalEvidence": [
                    {"source": "Policy assistenza v3.2", "section": "4.1"}
                ],
            },
            input={"question": "sostituzione", "role": "support", "language": "it"},
        )
    )
    assert "clienti Gold" in result.output["answer"]
    assert "Dimostrazione sintetica" in result.warnings[0]
