# Contributing to Vetra

Thank you for your interest in contributing to Vetra.

---

## Getting Started

1. Fork the repository.
2. Clone your fork:

```bash
git clone https://github.com/your-username/vetra.git
cd vetra
```

3. Create and activate a virtual environment:

```bash
python -m venv venv

# Windows
venv\Scripts\activate
```

4. Install dependencies:

```bash
pip install -r requirements.txt
```

5. Configure environment variables:

```bash
cp .env.example .env
```

Update the `.env` file with your database, Redis, and JWT configuration.

6. Run the application:

```bash
uvicorn main:app --reload
```

---

## How to Contribute

### Bug Reports

When reporting a bug, please include:

* Description of the issue
* Steps to reproduce
* Expected behavior
* Actual behavior

### Feature Requests

Open an issue describing:

* The proposed feature
* Why it would be useful
* Any implementation suggestions

### Pull Requests

1. Create a new branch from `main`.
2. Keep changes focused and well-documented.
3. Test your changes before submitting.
4. Open a pull request with a clear description.

---

## Security

Please do not report security vulnerabilities through public issues.

See **SECURITY.md** for responsible disclosure guidelines.

---

## Code Style

* Follow existing project structure and conventions.
* Keep code readable and maintainable.
* Avoid unnecessary dependencies.
* Write clear commit messages.

---

## Questions?

If you have questions, feel free to open an issue or start a discussion.

Thank you for helping improve Vetra.
