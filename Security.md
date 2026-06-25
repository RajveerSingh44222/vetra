# Security Policy

## Reporting a Vulnerability

Please do not disclose security vulnerabilities publicly.

If you discover a security issue, please report it privately by contacting:

**Email:** [rajsisodia446@gmail.com](mailto:rajsisodia446@gmail.com)

Please include:

* Description of the vulnerability
* Steps to reproduce
* Potential impact
* Suggested remediation (if available)

We will review reports and work toward a timely resolution.

---

## Security Model

| Component             | Implementation      |
| --------------------- | ------------------- |
| Password Hashing      | Argon2              |
| Authentication        | JWT Access Tokens   |
| Credential Encryption | AES Encryption      |
| Session Storage       | Redis               |
| Database              | PostgreSQL          |
| Transport Security    | HTTPS in Production |

---

## Supported Versions

Security updates are provided for the latest version of Vetra.

Users are encouraged to keep deployments up to date.

---

## Known Limitations

* Encryption keys are temporarily stored in Redis during active sessions.
* Two-Factor Authentication (2FA) is not currently implemented.
* Security monitoring and audit logging are planned for future releases.
* Users should use strong master passwords to maximize account security.

---

## Security Recommendations

For production deployments:

* Use HTTPS exclusively.
* Configure a strong `JWT_SECRET_KEY`.
* Restrict CORS to trusted domains.
* Never commit `.env` files or credentials.
* Regularly rotate secrets and access keys.
* Keep dependencies updated.
