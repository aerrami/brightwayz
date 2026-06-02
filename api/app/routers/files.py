"""
app/routers/files.py — client file uploads via S3 presigned URLs

Flow
----
1. Client calls POST /data/clients/{id}/files/start
   → Server creates a file record (status=pending) and returns a presigned S3 PUT URL.
2. Client uploads directly to S3 using the presigned URL.
3. Client calls POST /data/clients/{id}/files/{fileId}
   → Server marks the file record as uploaded.
4. GET /data/clients/{id}/files lists all files for the client.
"""
import uuid
from datetime import datetime, timezone

import boto3
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import require_user
from app.core.config import get_settings
from app.core.supabase import db_get, db_patch, db_post
from app.models.schemas import FileCompleteRequest, FileStartRequest, FileStartResponse

router = APIRouter(prefix="/data", tags=["files"])


def _s3():
    cfg = get_settings()
    return boto3.client("s3", region_name=cfg.aws_region)


def _now():
    return datetime.now(timezone.utc).isoformat()


@router.post("/clients/{client_id}/files/start", response_model=FileStartResponse)
async def start_file_upload(
    client_id: str,
    body: FileStartRequest,
    _user: dict = Depends(require_user),
):
    cfg = get_settings()
    file_id = str(uuid.uuid4())
    s3_key = f"clients/{client_id}/{file_id}/{body.filename}"

    try:
        upload_url = _s3().generate_presigned_url(
            "put_object",
            Params={
                "Bucket": cfg.aws_s3_bucket,
                "Key": s3_key,
                "ContentType": body.contentType,
            },
            ExpiresIn=900,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not generate upload URL: {e}")

    await db_post("client_files", {
        "id": file_id,
        "client_id": client_id,
        "org_id": body.orgId,
        "filename": body.filename,
        "mime_type": body.contentType,
        "size_bytes": body.size,
        "storage_url": f"s3://{cfg.aws_s3_bucket}/{s3_key}",
        "status": "pending",
        "created_at": _now(),
    })

    return FileStartResponse(fileId=file_id, uploadUrl=upload_url)


@router.post("/clients/{client_id}/files/{file_id}")
async def complete_file_upload(
    client_id: str,
    file_id: str,
    body: FileCompleteRequest,
    _user: dict = Depends(require_user),
):
    await db_patch(f"client_files?id=eq.{file_id}", {"status": "uploaded"})
    return {"success": True, "fileId": file_id}


@router.get("/clients/{client_id}/files")
async def list_client_files(
    client_id: str,
    orgId: str = Query(...),
    _user: dict = Depends(require_user),
):
    return await db_get(
        f"client_files?client_id=eq.{client_id}&org_id=eq.{orgId}&status=eq.uploaded&order=created_at.desc&select=*"
    )
