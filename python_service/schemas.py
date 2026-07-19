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


OUTPUT_SCHEMAS = {
    "document_classify": DocumentOutput,
}


def validate_output(task: str, output: dict) -> None:
    schema = OUTPUT_SCHEMAS.get(task)
    if schema is not None:
        schema.model_validate(output)
