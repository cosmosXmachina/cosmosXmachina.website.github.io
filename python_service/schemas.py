from pydantic import BaseModel, ConfigDict, Field


class DocumentFields(BaseModel):
    model_config = ConfigDict(extra="forbid")

    orderReference: str = Field(min_length=1, max_length=80)
    requestedDate: str
    total: float = Field(gt=0)
    currency: str = Field(pattern="^[A-Z]{3}$")


class DocumentOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    category: str
    priority: str
    fields: DocumentFields
    checks: list[str] = Field(min_length=1)


class KnowledgeOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    answer: str | None
    confidence: float = Field(ge=0, le=1)
    citations: list[str]
    abstained: bool
    reason: str | None


OUTPUT_SCHEMAS = {
    "document_classify": DocumentOutput,
    "knowledge_search": KnowledgeOutput,
}


def validate_output(task: str, output: dict) -> None:
    schema = OUTPUT_SCHEMAS.get(task)
    if schema is not None:
        schema.model_validate(output)
