# Systemd User Service Deployment

Run the Manity backend and frontend as persistent user services that auto-restart on failure and survive logout.

## Quick Start

```bash
# 1. Copy templates to your systemd user directory
mkdir -p ~/.config/systemd/user
cp deploy/manity-backend.service.template  ~/.config/systemd/user/manity-backend.service
cp deploy/manity-frontend.service.template ~/.config/systemd/user/manity-frontend.service

# 2. Edit both files - replace <PLACEHOLDER> values with your real paths and ports

# 3. Enable linger so services persist after logout (run as root or with sudo)
sudo loginctl enable-linger $(whoami)

# 4. Reload, enable, and start
systemctl --user daemon-reload
systemctl --user enable manity-backend manity-frontend
systemctl --user start manity-backend manity-frontend
```

## Day-to-Day Operations

| Task | Command |
|------|---------|
| Restart after code changes | `systemctl --user restart manity-backend` |
| Restart after frontend rebuild | `systemctl --user restart manity-frontend` |
| View backend logs | `journalctl --user -u manity-backend -f` |
| View frontend logs | `journalctl --user -u manity-frontend -f` |
| Check status | `systemctl --user status manity-backend manity-frontend` |
| Stop a service | `systemctl --user stop manity-backend` |
| After editing a .service file | `systemctl --user daemon-reload && systemctl --user restart <service>` |

**Important:** Do not use `pkill` or `kill` to stop processes - the service will auto-restart them. Always use `systemctl --user stop/restart`.

## Notes

- `RestartSec=10` prevents infinite rapid-restart loops if your code has errors
- `WantedBy=default.target` starts services as part of your user's default service group
- Backend loads env vars from `backend/.env` via `EnvironmentFile=` - make sure that file exists
- Frontend must be rebuilt (`npm run build`) before restarting the frontend service
