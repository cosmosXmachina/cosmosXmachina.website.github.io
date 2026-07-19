from dataclasses import asdict

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from python_service.provider import FixtureAIProvider
from python_service.retrieval import search_permitted
from python_service.schemas import validate_output


class ExecuteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    input: dict = Field(default_factory=dict)


TASKS = {
    ("document-operations", "classify"): "document_classify",
    ("knowledge-assistant", "search"): "knowledge_search",
    ("catalog-intelligence", "enrich"): "catalog_enrich",
}

app = FastAPI(
    title="cosmosXmachina private deterministic pipelines",
    docs_url=None,
    redoc_url=None,
)
provider = FixtureAIProvider()


@app.get("/health")
async def health() -> dict:
    return {"ok": True, "mode": "fixture", "externalAI": False}


@app.post("/execute/{demo}/{action}")
async def execute(demo: str, action: str, request: ExecuteRequest) -> dict:
    task = TASKS.get((demo, action))
    if task is None:
        raise HTTPException(status_code=404, detail="Unknown deterministic pipeline")

    context = {"demo": demo, "action": action}
    if task == "knowledge_search":
        context["retrievalEvidence"] = search_permitted(
            str(request.input.get("question", "")),
            str(request.input.get("role", "support")),
        )

    result = await provider.execute(
        task=task,
        schema={"id": f"{demo}.{action}", "type": "object"},
        context=context,
        input=request.input,
    )
    validate_output(task, result.output)
    return asdict(result)
