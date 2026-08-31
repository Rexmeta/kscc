# Authentication session policy

The application uses a seven-day signed JWT for the browser session. The token
contains only the account ID and the account's current `sessionVersion`
(`sv`); the server loads the current account for every protected request, so
role and active-state changes remain immediate.

`sessionVersion` is persistent account state, not an in-memory blacklist.
Incrementing it revokes every previously issued token for that account. The
application increments it when a password or email changes, when account
authorization changes (role, membership authorization, or active state), when
administrator bootstrap repairs an existing account, and on authenticated
logout. The token's seven-day expiration remains the upper bound for an
otherwise valid session.

Tokens issued before this field was introduced are treated as version zero.
They stop working after the first session-version increment for the account.