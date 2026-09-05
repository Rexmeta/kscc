# Authentication session policy

The application uses a seven-day signed JWT in the `auth_session` HttpOnly
cookie for the browser session. The cookie is `SameSite=Lax`, scoped to `/`,
and `Secure` in production. It contains only the account ID and the account's
current `sessionVersion` (`sv`); the server loads the current account for every
protected request, so role and active-state changes remain immediate.

The browser never receives the account token in an API response and does not
store it in Web Storage. A readable `csrf_token` cookie is issued separately.
State-changing API requests must come from the application origin and, when an
account session is present, must echo that value in the `X-CSRF-Token` header.
The CSRF cookie is not an authentication credential.

`sessionVersion` is persistent account state, not an in-memory blacklist.
Incrementing it revokes every previously issued token for that account. The
application increments it when a password or email changes, when account
authorization changes (role, membership authorization, or active state), when
administrator bootstrap repairs an existing account, and on authenticated
logout. The token's seven-day expiration remains the upper bound for an
otherwise valid session. Logout and security-sensitive profile changes clear
the session cookie after revoking the account's session version.

Tokens issued before this field was introduced are treated as version zero.
They stop working after the first session-version increment for the account.