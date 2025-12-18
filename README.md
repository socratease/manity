# manity
Manity is a personal project tracking app

## CORS (no-auth deployments)

- The backend runs with `allow_credentials=False`, so browsers should **not** expect an `access-control-allow-credentials` header.
- Allowed origins are echoed back when they match configured values; when a wildcard is configured the server uses a permissive regex so the requesting `Origin` is still reflected.
- Frontend fetch calls are sent without `credentials: 'include'`, keeping requests cookie-free by default.
