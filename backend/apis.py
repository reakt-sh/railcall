"""Main API routes"""

import logging
from typing import Any
from fastapi import APIRouter, Response, Body

router = APIRouter()
logger = logging.getLogger("app.api")

## Routes


@router.get("/alive")
async def alive():
    """Used for health checks. Only sends success."""
    return Response()  # Just 200


@router.post("/test")
async def raw_tracker(body: Any = Body()):
    """Replace with actual route"""
    logger.info("Test: %s", str(body))
    return Response()
