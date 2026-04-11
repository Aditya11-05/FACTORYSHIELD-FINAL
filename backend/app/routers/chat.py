"""
FactoryShield — chat router
POST /api/chat
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.chatbot import chat_with_engineer

router = APIRouter()


class Message(BaseModel):
    role:    str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message:  str
    history:  Optional[List[Message]] = []


@router.post("/chat")
async def chat(req: ChatRequest):
    try:
        history = [m.dict() for m in (req.history or [])]
        reply   = await chat_with_engineer(req.message, history)
        return {
            "reply":   reply,
            "message": req.message,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
