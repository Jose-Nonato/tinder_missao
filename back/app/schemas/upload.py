from pydantic import BaseModel, Field


class UploadResponse(BaseModel):
    url: str


class UploadDiscard(BaseModel):
    url: str = Field(max_length=2048)
