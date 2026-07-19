import asyncio

from python_service.provider import FixtureAIProvider


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
