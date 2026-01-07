import smtplib

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session

from backend.main import (
    EmailSendPayload,
    EmailSettingsPayload,
    EmailSettingsResponse,
    dispatch_email,
    get_email_settings,
    get_session,
    log_action,
    normalize_recipients,
    serialize_email_settings,
)

router = APIRouter(tags=["email"])


@router.get("/settings/email", response_model=EmailSettingsResponse)
def read_email_settings(session: Session = Depends(get_session)):
    settings = get_email_settings(session)
    return serialize_email_settings(settings)


@router.put("/settings/email", response_model=EmailSettingsResponse)
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


@router.post("/actions/email", status_code=status.HTTP_202_ACCEPTED)
def send_email_action(payload: EmailSendPayload, request: Request, session: Session = Depends(get_session)):
    """
    Send an email and verify server acceptance.

    SMTP settings are now passed inline with each request (stored in browser localStorage).
    Returns 200 with sent_to list on success.
    Returns 400 for configuration/validation errors.
    Returns 502 for SMTP server errors.
    """
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

    # Return detailed result including which recipients were successful
    return {
        "status": "sent",
        "sent_to": result["sent_to"],
        "refused": result["refused"],
        "message": f"Email delivered to {len(result['sent_to'])} recipient(s)"
    }
