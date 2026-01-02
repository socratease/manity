import logging
import os
import smtplib
import argparse
from typing import Optional, Sequence, List
from datetime import datetime
from email.message import EmailMessage

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

# Import new modules
from .models.models import (
    Person, Project, Task, Subtask, Activity, EmailSettings, AuditLog, MigrationState,
    PersonReference, Stakeholder
)
from .schemas.schemas import (
    PersonPayload, ProjectPayload, ImportPayload, EmailSettingsPayload,
    EmailSettingsResponse, EmailSendPayload, ChatRequest, ChatProvider,
    SlidesExportPayload, SlideData
)
from .services.person_service import (
    upsert_person_from_payload,
    get_person_by_name,
    resolve_person_reference,
    build_person_index,
    generate_id
)
from .database import engine, get_session, create_db_and_tables, current_environment, PROTECTED_ENVIRONMENTS
from .utils import log_action, get_logged_in_user

# Register router
from .routers import projects as projects_router

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

ADMIN_TOKEN_ENV = "MANITY_ADMIN_TOKEN"
FRONTEND_ORIGINS_ENV = "FRONTEND_ORIGINS"
FRONTEND_ORIGIN_REGEX_ENV = "FRONTEND_ORIGIN_REGEX"

app = FastAPI(title="Manity Portfolio API")

def parse_origins(value: str | None) -> list[str]:
    return [origin.strip() for origin in (value or "").split(",") if origin.strip()]

def configured_frontend_origins() -> tuple[list[str], str | None]:
    origins = parse_origins(os.getenv(FRONTEND_ORIGINS_ENV))
    origin_regex = os.getenv(FRONTEND_ORIGIN_REGEX_ENV) or None

    if not origins and not origin_regex:
        origin_regex = r"^https?://(localhost|127\.0\.0\.1|rn000224)(:\d+)?$"

    return origins, origin_regex

allowed_origins, allowed_origin_regex = configured_frontend_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allowed_origin_regex,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(projects_router.router)

def extract_bearer_token(auth_header: str | None) -> str | None:
    if not auth_header:
        return None
    if not auth_header.lower().startswith("bearer "):
        return None
    return auth_header.split(None, 1)[1].strip() or None

def ensure_admin(request: Request) -> None:
    expected_token = os.getenv(ADMIN_TOKEN_ENV)
    if not expected_token:
        if current_environment() in PROTECTED_ENVIRONMENTS:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Admin token not configured for this environment",
            )
        logger.warning(
            "Admin token not configured; allowing admin endpoints in non-protected environment"
        )
        return

    provided_token = (
        request.headers.get("x-admin-token")
        or extract_bearer_token(request.headers.get("authorization"))
    )
    if not provided_token or provided_token != expected_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid admin token",
        )

def serialize_person(person: Optional[Person]) -> Optional[dict]:
    if person is None:
        return None
    return {
        "id": person.id,
        "name": person.name,
        "team": person.team,
        "email": person.email,
    }

@app.get("/people")
def list_people(session: Session = Depends(get_session)):
    statement = select(Person)
    people = session.exec(statement).all()

    unique_people: dict[str, Person] = {}
    seen_people: set[str] = set()
    for person in people:
        email_key = person.email.lower() if person.email else None
        name_key = person.name.lower() if person.name else None

        existing = None
        if email_key and email_key in unique_people:
            existing = unique_people[email_key]
        elif name_key and name_key in unique_people:
            existing = unique_people[name_key]

        if existing is None:
            if name_key:
                unique_people[name_key] = person
            if email_key:
                unique_people[email_key] = person
            continue

        existing.team = existing.team or person.team
        existing.email = existing.email or person.email
        session.delete(person)

    deduped_people: list[Person] = []
    for person in unique_people.values():
        if person.id in seen_people:
            continue
        seen_people.add(person.id)
        deduped_people.append(person)

    session.commit()
    return [serialize_person(person) for person in deduped_people]

@app.post("/people", status_code=status.HTTP_201_CREATED)
def create_person(payload: PersonPayload, request: Request, session: Session = Depends(get_session)):
    person = upsert_person_from_payload(session, payload)
    log_action(session, "create_person", "person", person.id, {"name": person.name, "team": person.team}, request)
    return serialize_person(person)

@app.get("/people/{person_id}")
def get_person(person_id: str, session: Session = Depends(get_session)):
    person = session.exec(select(Person).where(Person.id == person_id)).first()
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")
    return serialize_person(person)

@app.put("/people/{person_id}")
def update_person(person_id: str, payload: PersonPayload, request: Request, session: Session = Depends(get_session)):
    person = session.exec(select(Person).where(Person.id == person_id)).first()
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")

    normalized_name = payload.name.strip()

    conflict = get_person_by_name(session, normalized_name)
    if conflict and conflict.id != person.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A person with that name already exists",
        )

    old_values = {"name": person.name, "team": person.team, "email": person.email}
    person.name = normalized_name
    person.team = payload.team
    person.email = payload.email
    session.add(person)
    session.commit()
    session.refresh(person)
    log_action(session, "update_person", "person", person_id, {"old": old_values, "new": {"name": person.name, "team": person.team, "email": person.email}}, request)
    return serialize_person(person)

@app.delete("/people/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_person(person_id: str, request: Request, session: Session = Depends(get_session)):
    person = session.exec(select(Person).where(Person.id == person_id)).first()
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")
    deleted_data = {"name": person.name, "team": person.team}
    session.delete(person)
    session.commit()
    log_action(session, "delete_person", "person", person_id, deleted_data, request)
    return None

def get_email_settings(session: Session) -> EmailSettings:
    settings = session.get(EmailSettings, 1)
    if settings is None:
        settings = EmailSettings(id=1)
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings

def serialize_email_settings(settings: EmailSettings) -> dict:
    return {
        "smtpServer": settings.smtp_server,
        "smtpPort": settings.smtp_port,
        "username": settings.username or "",
        "fromAddress": settings.from_address or "",
        "useTLS": settings.use_tls,
        "hasPassword": bool(settings.password),
    }

def normalize_recipients(raw: Sequence[str] | str) -> list[str]:
    if isinstance(raw, str):
        candidates = [raw]
    else:
        candidates = list(raw)

    recipients: list[str] = []
    for candidate in candidates:
        if not candidate:
            continue
        if isinstance(candidate, str):
            parts = candidate.replace(";", ",").split(",")
            for part in parts:
                normalized = part.strip()
                if normalized:
                    recipients.append(normalized)
    return recipients

def dispatch_email(
    smtp_server: str,
    smtp_port: int,
    from_address: str,
    recipients: list[str],
    subject: str,
    body: str,
    username: str | None = None,
    password: str | None = None,
    use_tls: bool = False
) -> dict:
    if not smtp_server:
        raise ValueError("SMTP server is not configured. Please set the server address in settings.")
    if not from_address:
        raise ValueError("Sender address is not configured. Please set the From address in settings.")
    if not recipients:
        raise ValueError("At least one recipient is required")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = from_address
    message["To"] = ", ".join(recipients)
    message.set_content(body)

    try:
        with smtplib.SMTP(smtp_server, smtp_port, timeout=30) as smtp:
            if hasattr(smtp, "noop"):
                code, resp = smtp.noop()
                if code != 250:
                    raise smtplib.SMTPException(f"Server not ready: {code} {resp.decode()}")

            if use_tls:
                try:
                    if hasattr(smtp, "starttls"):
                        result = smtp.starttls()
                        if isinstance(result, tuple):
                            code, resp = result
                            if code != 220:
                                logger.warning("STARTTLS failed with code %d, continuing without TLS", code)
                    else:
                        logger.info("Server does not support STARTTLS, sending without encryption")
                except smtplib.SMTPNotSupportedError:
                    logger.info("Server does not support STARTTLS, sending without encryption")

            if username and password:
                smtp.login(username, password)

            refused = smtp.send_message(message)

            if refused:
                refused_addrs = list(refused.keys())
                logger.warning("Some recipients refused: %s", refused_addrs)
                if len(refused_addrs) == len(recipients):
                    raise smtplib.SMTPRecipientsRefused(refused)

            if hasattr(smtp, "noop"):
                code, resp = smtp.noop()
                if code != 250:
                    logger.warning("Post-send NOOP returned %d: %s", code, resp.decode())

            successful = [r for r in recipients if r not in (refused or {})]
            logger.info("Email sent successfully to %d recipient(s): %s", len(successful), successful)

            return {
                "sent_to": successful,
                "refused": list(refused.keys()) if refused else []
            }

    except smtplib.SMTPAuthenticationError as exc:
        logger.exception("SMTP authentication failed")
        raise ValueError(f"Authentication failed: {exc.smtp_error.decode() if exc.smtp_error else str(exc)}")
    except smtplib.SMTPRecipientsRefused as exc:
        logger.exception("All recipients refused")
        raise ValueError(f"All recipients refused by server")
    except smtplib.SMTPConnectError as exc:
        logger.exception("Failed to connect to SMTP server")
        raise ValueError(f"Could not connect to email server at {smtp_server}:{smtp_port}. Please check your settings.")
    except smtplib.SMTPException as exc:
        logger.exception("SMTP error sending email")
        raise exc
    except ConnectionRefusedError:
        logger.exception("Connection refused by SMTP server")
        raise ValueError(f"Connection refused by email server at {smtp_server}:{smtp_port}. Please verify the server is running.")
    except Exception as exc:
        logger.exception("Failed to send email")
        raise exc

@app.get("/settings/email", response_model=EmailSettingsResponse)
def read_email_settings(session: Session = Depends(get_session)):
    settings = get_email_settings(session)
    return serialize_email_settings(settings)

@app.put("/settings/email", response_model=EmailSettingsResponse)
def update_email_settings(payload: EmailSettingsPayload, session: Session = Depends(get_session)):
    settings = get_email_settings(session)
    settings.smtp_server = payload.smtpServer
    settings.smtp_port = payload.smtpPort
    settings.username = payload.username or None
    settings.from_address = payload.fromAddress or None
    settings.use_tls = payload.useTLS

    if payload.password is not None:
        settings.password = payload.password

    session.add(settings)
    session.commit()
    session.refresh(settings)
    return serialize_email_settings(settings)

@app.post("/actions/email", status_code=status.HTTP_202_ACCEPTED)
def send_email_action(payload: EmailSendPayload, request: Request, session: Session = Depends(get_session)):
    recipients = normalize_recipients(payload.recipients)

    settings = get_email_settings(session)

    smtp_server = payload.smtp_server or settings.smtp_server
    smtp_port = payload.smtp_port or settings.smtp_port
    from_address = payload.from_address or settings.from_address
    username = payload.username if payload.username is not None else settings.username
    password = payload.password if payload.password is not None else settings.password
    use_tls = payload.use_tls if payload.use_tls is not None else settings.use_tls

    try:
        result = dispatch_email(
            smtp_server=smtp_server or "",
            smtp_port=smtp_port or 587,
            from_address=from_address or "",
            recipients=recipients,
            subject=payload.subject,
            body=payload.body,
            username=username,
            password=password,
            use_tls=use_tls if use_tls is not None else True
        )
    except ValueError as exc:
        log_action(session, "send_email_failed", "email", None, {"error": str(exc), "recipient_count": len(recipients)}, request)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except smtplib.SMTPException as exc:
        log_action(session, "send_email_failed", "email", None, {"error": str(exc), "recipient_count": len(recipients)}, request)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"SMTP error: {str(exc)}")

    log_action(session, "send_email", "email", None, {"recipient_count": len(result["sent_to"]), "subject_preview": payload.subject[:50] if payload.subject else None}, request)

    return {
        "status": "sent",
        "sent_to": result["sent_to"],
        "refused": result["refused"],
        "message": f"Email delivered to {len(result['sent_to'])} recipient(s)"
    }

def _resolve_provider(provider_override: ChatProvider | None) -> ChatProvider:
    if provider_override:
        return provider_override

    env_provider = os.getenv("LLM_PROVIDER", ChatProvider.OPENAI.value)
    try:
        return ChatProvider(env_provider.lower())
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unsupported LLM provider configured: {env_provider}",
        ) from exc

def _build_llm_request(payload: ChatRequest) -> tuple[str, dict, dict]:
    provider = _resolve_provider(payload.provider)

    request_body = {
        "model": payload.model,
        "messages": [message.model_dump() for message in payload.messages],
    }

    if payload.response_format is not None:
        request_body["response_format"] = payload.response_format

    if provider is ChatProvider.OPENAI:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="OpenAI API key not configured on server",
            )

        base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
        url = f"{base_url}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }
        return url, headers, request_body

    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "").rstrip("/")
    deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")

    if not api_key or not endpoint or not deployment:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Azure OpenAI configuration is incomplete",
        )

    url = (
        f"{endpoint}/openai/deployments/{deployment}/chat/completions"
        f"?api-version={api_version}"
    )
    headers = {
        "Content-Type": "application/json",
        "api-key": api_key,
    }
    return url, headers, request_body

@app.post("/api/llm/chat")
async def proxy_llm_chat(payload: ChatRequest, request: Request, session: Session = Depends(get_session)):
    url, headers, request_body = _build_llm_request(payload)

    message_summary = [{"role": m.role.value, "content_length": len(m.content)} for m in payload.messages]

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(url, headers=headers, json=request_body)
    except httpx.HTTPError as exc:
        log_action(session, "llm_chat_error", "llm", None, {"model": payload.model, "error": str(exc), "message_count": len(payload.messages)}, request)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upstream request failed: {exc}",
        ) from exc

    if response.status_code >= 400:
        log_action(session, "llm_chat_error", "llm", None, {"model": payload.model, "status_code": response.status_code, "message_count": len(payload.messages)}, request)
        raise HTTPException(
            status_code=response.status_code,
            detail=response.text,
        )

    data = response.json()
    message_content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

    thinking = None
    if isinstance(message_content, list):
        thinking_parts = []
        text_parts = []
        for block in message_content:
            if isinstance(block, dict):
                if block.get("type") == "thinking":
                    thinking_parts.append(block.get("thinking", ""))
                elif block.get("type") == "text":
                    text_parts.append(block.get("text", ""))
        thinking = "\n".join(thinking_parts) if thinking_parts else None
        content = "\n".join(text_parts) if text_parts else ""
    else:
        content = message_content if message_content else ""

    import json
    conversation_log = {
        "model": payload.model,
        "messages": [{"role": m.role.value, "content": m.content} for m in payload.messages],
        "response": content,
        "thinking": thinking,
        "usage": data.get("usage", {})
    }
    log_action(session, "llm_chat", "llm", None, conversation_log, request)

    return {"content": content, "thinking": thinking, "raw": data}

def create_powerpoint_presentation(slides: List[SlideData]) -> bytes:
    import io
    from pptx import Presentation
    from pptx.util import Inches, Pt, Emu
    from pptx.dml.color import RGBColor
    from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
    from pptx.enum.shapes import MSO_SHAPE

    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    CHARCOAL = RGBColor(58, 54, 49)
    STONE = RGBColor(107, 101, 84)
    CLOUD = RGBColor(232, 227, 216)
    CREAM = RGBColor(250, 248, 243)
    SAGE = RGBColor(122, 155, 118)
    CORAL = RGBColor(215, 119, 100)
    AMBER = RGBColor(218, 165, 32)
    EARTH = RGBColor(139, 111, 71)
    WHITE = RGBColor(255, 255, 255)

    def sanitize_text(value: str) -> str:
        if not value:
            return ""
        return os.re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", value)

    def get_priority_color(priority: str) -> RGBColor:
        colors = {
            'high': CORAL,
            'medium': AMBER,
            'low': SAGE
        }
        return colors.get(priority, STONE)

    def add_rounded_rectangle(slide, left, top, width, height, fill_color=None, line_color=None):
        shape = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE,
            left, top, width, height
        )
        shape.fill.solid()
        shape.fill.fore_color.rgb = fill_color if fill_color else WHITE
        if line_color:
            shape.line.color.rgb = line_color
            shape.line.width = Pt(1)
        else:
            shape.line.fill.background()
        try:
            if shape.adjustments and len(shape.adjustments) > 0:
                shape.adjustments[0] = 0.1
        except (IndexError, TypeError):
            pass
        return shape

    def add_text_box(slide, left, top, width, height, text, font_size=12, font_color=CHARCOAL, bold=False, alignment=PP_ALIGN.LEFT):
        textbox = slide.shapes.add_textbox(left, top, width, height)
        tf = textbox.text_frame
        tf.word_wrap = True
        tf.auto_size = None
        p = tf.paragraphs[0]
        p.text = sanitize_text(text)
        p.font.size = Pt(font_size)
        p.font.color.rgb = font_color
        p.font.bold = bold
        p.font.name = "Arial"
        p.alignment = alignment
        return textbox

    def format_datetime_simple(date_str: str) -> str:
        try:
            date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return date.strftime('%b %d, %Y')
        except:
            return date_str

    for slide_data in slides:
        blank_layout = prs.slide_layouts[6]
        slide = prs.slides.add_slide(blank_layout)

        slide_background = slide.background
        fill = slide_background.fill
        fill.solid()
        fill.fore_color.rgb = CREAM

        MARGIN = Inches(0.5)
        HEADER_HEIGHT = Inches(1.2)
        PANEL_GAP = Inches(0.2)
        CONTENT_TOP = MARGIN + HEADER_HEIGHT + Inches(0.3)
        CONTENT_HEIGHT = prs.slide_height - CONTENT_TOP - MARGIN
        HALF_WIDTH = (prs.slide_width - MARGIN * 2 - PANEL_GAP) / 2

        title_box = add_text_box(
            slide, MARGIN, MARGIN, prs.slide_width - MARGIN * 2, Inches(0.5),
            sanitize_text(slide_data.name), font_size=24, font_color=CHARCOAL, bold=True
        )

        if slide_data.description:
            add_text_box(
                slide, MARGIN, MARGIN + Inches(0.45), prs.slide_width - MARGIN * 2, Inches(0.3),
                sanitize_text(slide_data.description), font_size=12, font_color=CHARCOAL
            )

        meta_y = MARGIN + Inches(0.85)
        meta_x = MARGIN

        target_text = sanitize_text(f"Target: {slide_data.targetDate if slide_data.targetDate else 'TBD'}")
        target_box = add_text_box(slide, meta_x, meta_y, Inches(1.5), Inches(0.25), target_text, font_size=10, font_color=STONE)
        meta_x += Inches(1.6)

        priority_color = get_priority_color(slide_data.priority)
        priority_shape = add_rounded_rectangle(slide, meta_x, meta_y, Inches(1.1), Inches(0.25), fill_color=CREAM, line_color=priority_color)
        priority_tf = priority_shape.text_frame
        priority_tf.paragraphs[0].text = sanitize_text(f"{slide_data.priority} priority")
        priority_tf.paragraphs[0].font.size = Pt(9)
        priority_tf.paragraphs[0].font.color.rgb = priority_color
        priority_tf.paragraphs[0].font.bold = True
        priority_tf.paragraphs[0].alignment = PP_ALIGN.CENTER
        priority_shape.text_frame.paragraphs[0].space_before = Pt(2)
        meta_x += Inches(1.2)

        status_shape = add_rounded_rectangle(slide, meta_x, meta_y, Inches(0.9), Inches(0.25), fill_color=CLOUD)
        status_tf = status_shape.text_frame
        status_tf.paragraphs[0].text = sanitize_text(slide_data.status)
        status_tf.paragraphs[0].font.size = Pt(9)
        status_tf.paragraphs[0].font.color.rgb = CHARCOAL
        status_tf.paragraphs[0].font.bold = True
        status_tf.paragraphs[0].alignment = PP_ALIGN.CENTER
        status_shape.text_frame.paragraphs[0].space_before = Pt(2)
        meta_x += Inches(1.0)

        if slide_data.stakeholders:
            stakeholder_names = [s.name for s in slide_data.stakeholders[:5]]
            stakeholder_text = sanitize_text(", ".join(stakeholder_names))
            if len(slide_data.stakeholders) > 5:
                stakeholder_text += sanitize_text(f" +{len(slide_data.stakeholders) - 5}")
            add_text_box(slide, meta_x, meta_y, Inches(4), Inches(0.25), sanitize_text(f"Team: {stakeholder_text}"), font_size=10, font_color=STONE)

        line = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE,
            MARGIN, CONTENT_TOP - Inches(0.15), prs.slide_width - MARGIN * 2, Pt(1)
        )
        line.fill.solid()
        line.fill.fore_color.rgb = CLOUD
        line.line.fill.background()

        left_x = MARGIN
        panel_width = HALF_WIDTH
        exec_height = Inches(1.5)
        updates_height = CONTENT_HEIGHT - exec_height - PANEL_GAP

        exec_panel = add_rounded_rectangle(slide, left_x, CONTENT_TOP, panel_width, exec_height, fill_color=WHITE, line_color=CLOUD)

        add_text_box(slide, left_x + Inches(0.15), CONTENT_TOP + Inches(0.1), panel_width - Inches(0.3), Inches(0.2),
                    "EXECUTIVE UPDATE", font_size=9, font_color=STONE, bold=True)

        exec_content = sanitize_text(slide_data.executiveUpdate or slide_data.description or "No executive update yet.")
        exec_text_box = slide.shapes.add_textbox(
            left_x + Inches(0.15), CONTENT_TOP + Inches(0.35),
            panel_width - Inches(0.3), exec_height - Inches(0.5)
        )
        exec_tf = exec_text_box.text_frame
        exec_tf.word_wrap = True
        exec_tf.paragraphs[0].text = exec_content[:500]
        exec_tf.paragraphs[0].font.size = Pt(10)
        exec_tf.paragraphs[0].font.color.rgb = STONE
        exec_tf.paragraphs[0].font.name = "Arial"

        updates_top = CONTENT_TOP + exec_height + PANEL_GAP
        updates_panel = add_rounded_rectangle(slide, left_x, updates_top, panel_width, updates_height, fill_color=WHITE, line_color=CLOUD)

        add_text_box(slide, left_x + Inches(0.15), updates_top + Inches(0.1), panel_width - Inches(0.3), Inches(0.2),
                    "RECENT UPDATES", font_size=9, font_color=STONE, bold=True)

        updates_y = updates_top + Inches(0.35)
        for i, update in enumerate(slide_data.recentUpdates[:3]):
            if updates_y > updates_top + updates_height - Inches(0.4):
                break
            add_text_box(slide, left_x + Inches(0.15), updates_y, Inches(1.5), Inches(0.2),
                        sanitize_text(update.author), font_size=10, font_color=CHARCOAL, bold=True)
            add_text_box(slide, left_x + panel_width - Inches(1.5), updates_y, Inches(1.35), Inches(0.2),
                        sanitize_text(format_datetime_simple(update.date)), font_size=9, font_color=STONE, alignment=PP_ALIGN.RIGHT)
            updates_y += Inches(0.2)
            note_box = slide.shapes.add_textbox(left_x + Inches(0.15), updates_y, panel_width - Inches(0.3), Inches(0.4))
            note_tf = note_box.text_frame
            note_tf.word_wrap = True
            note_tf.paragraphs[0].text = sanitize_text(update.note)[:150]
            note_tf.paragraphs[0].font.size = Pt(9)
            note_tf.paragraphs[0].font.color.rgb = STONE
            note_tf.paragraphs[0].font.name = "Arial"
            updates_y += Inches(0.45)

        if not slide_data.recentUpdates:
            add_text_box(slide, left_x + Inches(0.15), updates_top + Inches(0.4), panel_width - Inches(0.3), Inches(0.2),
                        "No updates yet.", font_size=10, font_color=STONE)

        right_x = MARGIN + HALF_WIDTH + PANEL_GAP
        half_height = (CONTENT_HEIGHT - PANEL_GAP) / 2

        completed_panel = add_rounded_rectangle(slide, right_x, CONTENT_TOP, panel_width, half_height, fill_color=WHITE, line_color=SAGE)

        add_text_box(slide, right_x + Inches(0.15), CONTENT_TOP + Inches(0.1), panel_width - Inches(0.3), Inches(0.2),
                    "RECENTLY COMPLETED", font_size=9, font_color=STONE, bold=True)

        completed_y = CONTENT_TOP + Inches(0.35)
        for task in slide_data.recentlyCompleted[:3]:
            if completed_y > CONTENT_TOP + half_height - Inches(0.3):
                break
            task_box = slide.shapes.add_textbox(right_x + Inches(0.15), completed_y, panel_width - Inches(1.2), Inches(0.25))
            task_tf = task_box.text_frame
            task_tf.word_wrap = True
            task_tf.paragraphs[0].text = sanitize_text(task.title)[:60]
            task_tf.paragraphs[0].font.size = Pt(10)
            task_tf.paragraphs[0].font.color.rgb = CHARCOAL
            task_tf.paragraphs[0].font.bold = True
            task_tf.paragraphs[0].font.name = "Arial"
            add_text_box(slide, right_x + panel_width - Inches(1), completed_y, Inches(0.85), Inches(0.2),
                        sanitize_text(task.date), font_size=9, font_color=SAGE, alignment=PP_ALIGN.RIGHT)
            completed_y += Inches(0.35)

        if not slide_data.recentlyCompleted:
            add_text_box(slide, right_x + Inches(0.15), CONTENT_TOP + Inches(0.4), panel_width - Inches(0.3), Inches(0.2),
                        "No recently completed tasks.", font_size=10, font_color=STONE)

        nextup_top = CONTENT_TOP + half_height + PANEL_GAP
        nextup_panel = add_rounded_rectangle(slide, right_x, nextup_top, panel_width, half_height, fill_color=WHITE, line_color=SAGE)

        add_text_box(slide, right_x + Inches(0.15), nextup_top + Inches(0.1), panel_width - Inches(0.3), Inches(0.2),
                    "NEXT UP", font_size=9, font_color=STONE, bold=True)

        nextup_y = nextup_top + Inches(0.35)
        for task in slide_data.nextUp[:3]:
            if nextup_y > nextup_top + half_height - Inches(0.3):
                break
            task_box = slide.shapes.add_textbox(right_x + Inches(0.15), nextup_y, panel_width - Inches(1.2), Inches(0.25))
            task_tf = task_box.text_frame
            task_tf.word_wrap = True
            task_tf.paragraphs[0].text = sanitize_text(task.title)[:60]
            task_tf.paragraphs[0].font.size = Pt(10)
            task_tf.paragraphs[0].font.color.rgb = CHARCOAL
            task_tf.paragraphs[0].font.bold = True
            task_tf.paragraphs[0].font.name = "Arial"
            date_text = sanitize_text(task.date)
            date_color = CORAL if 'overdue' in date_text.lower() else (AMBER if 'today' in date_text.lower() or 'tomorrow' in date_text.lower() else STONE)
            add_text_box(slide, right_x + panel_width - Inches(1), nextup_y, Inches(0.85), Inches(0.2),
                        date_text, font_size=9, font_color=date_color, alignment=PP_ALIGN.RIGHT)
            nextup_y += Inches(0.35)

        if not slide_data.nextUp:
            add_text_box(slide, right_x + Inches(0.15), nextup_top + Inches(0.4), panel_width - Inches(0.3), Inches(0.2),
                        "No upcoming tasks.", font_size=10, font_color=STONE)

    pptx_bytes = io.BytesIO()
    prs.save(pptx_bytes)
    pptx_bytes.seek(0)
    return pptx_bytes.getvalue()

@app.post("/api/slides/export")
def export_slides_to_powerpoint(payload: SlidesExportPayload, request: Request, session: Session = Depends(get_session)):
    if not payload.slides:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No slides provided")

    try:
        pptx_bytes = create_powerpoint_presentation(payload.slides)
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="python-pptx library not installed. Please install it with: pip install python-pptx"
        )
    except Exception as e:
        logger.exception("Failed to generate PowerPoint")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PowerPoint: {str(e)}"
        )

    log_action(session, "export_slides_pptx", "slides", None, {"slide_count": len(payload.slides)}, request)

    return Response(
        content=pptx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={
            "Content-Disposition": f"attachment; filename=portfolio-slides-{datetime.utcnow().strftime('%Y-%m-%d')}.pptx"
        }
    )

@app.get("/")
def root():
    return {"status": "ok"}

def validate_admin_token_for_cli(admin_token: str | None) -> None:
    expected_token = os.getenv(ADMIN_TOKEN_ENV)
    if not expected_token:
        if current_environment() in PROTECTED_ENVIRONMENTS:
            raise RuntimeError("Admin token not configured for this environment")
        logger.warning(
            "Admin token not configured; allowing admin CLI command in non-protected environment"
        )
        return
    if not admin_token:
        raise RuntimeError("Admin token required for this operation")
    if admin_token != expected_token:
        raise RuntimeError("Invalid admin token")

def main() -> None:
    parser = argparse.ArgumentParser(description="Manity Portfolio API utilities")
    subparsers = parser.add_subparsers(dest="command")
    backfill_parser = subparsers.add_parser(
        "run-people-backfill",
        help="Run the people backfill migration before starting the API server",
    )
    backfill_parser.add_argument(
        "--admin-token",
        default=os.getenv(ADMIN_TOKEN_ENV),
        help="Admin token for protected environments (defaults to MANITY_ADMIN_TOKEN)",
    )

    args = parser.parse_args()

    if args.command == "run-people-backfill":
        from .migrate_stakeholders import run_people_backfill_migration
        create_db_and_tables()
        with Session(engine) as session:
            run_people_backfill_migration(session)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
