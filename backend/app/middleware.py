import json as _json
import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import Response as StarletteResponse

from app.core.config import settings

logger = logging.getLogger("sigmaspend")

MAX_PAYLOAD_BYTES = 8 * 1024


def _truncate(raw: bytes) -> object:
    if len(raw) > MAX_PAYLOAD_BYTES:
        preview = raw[:MAX_PAYLOAD_BYTES].decode("utf-8", errors="replace")
        return {"_truncated": True, "preview": preview, "original_bytes": len(raw)}
    try:
        return _json.loads(raw)
    except _json.JSONDecodeError:
        return raw.decode("utf-8", errors="replace")


def register_middleware(app: FastAPI) -> None:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://localhost:5174"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def log_requests_and_responses(request: Request, call_next):
        start_time = time.time()
        method = request.method
        path = request.url.path
        client_host = request.client.host if request.client else "unknown"

        if path.startswith(f"{settings.API_V1_STR}/logs"):
            return await call_next(request)

        request_payload = None
        if method in ("POST", "PUT", "PATCH"):
            body_bytes = await request.body()
            if body_bytes:
                request_payload = _truncate(body_bytes)

            async def _replay_receive():
                return {"type": "http.request", "body": body_bytes, "more_body": False}
            request = Request(request.scope, _replay_receive)

        elif method in ("GET", "DELETE"):
            params = dict(request.query_params)
            if params:
                request_payload = params

        http_extra = {"http_method": method, "http_path": path}

        logger.info(
            f"📥 Incoming: {method} {path} | Client IP: {client_host}",
            extra={"payload": request_payload, **http_extra},
        )

        try:
            response = await call_next(request)
            process_time = (time.time() - start_time) * 1000
            status_code = response.status_code

            response_body = b""
            async for chunk in response.body_iterator:
                response_body += chunk

            response_payload = None
            is_mutation = method in ("POST", "PUT", "PATCH", "DELETE")
            is_error = status_code >= 400
            content_type = response.headers.get("content-type", "")
            if (is_mutation or is_error) and "application/json" in content_type and response_body:
                response_payload = _truncate(response_body)

            log_msg = f"📤 Response: {method} {path} -> Status: {status_code} | Latency: {process_time:.2f}ms"
            log_level = logger.warning if status_code >= 400 else logger.info
            log_level(log_msg, extra={"payload": response_payload, **http_extra})

            return StarletteResponse(
                content=response_body,
                status_code=status_code,
                headers=dict(response.headers),
                media_type=response.media_type,
            )

        except Exception as e:
            process_time = (time.time() - start_time) * 1000
            logger.error(
                f"💥 Pipeline Crash: {method} {path} failed after {process_time:.2f}ms | Error: {str(e)}",
                extra={"payload": request_payload, **http_extra},
            )
            raise e
