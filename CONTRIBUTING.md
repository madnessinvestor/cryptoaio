# Contributing to CryptoAIO

Thank you for your interest in contributing to **CryptoAIO**! 🟢

If you'd like to contribute code, please do so through GitHub by forking the repository and sending a pull request.

---

## Getting Started

1. **Fork** the repository and clone your fork locally.
2. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Run the app:
   ```
   python3 app.py
   ```
   The app will be available at `http://localhost:5000`.

---

## Guidelines

- **Follow the existing code style.** The backend is plain Python/Flask; the frontend is Vanilla JS — no frameworks. Keep it that way.
- **Keep it privacy-first.** CryptoAIO does not require accounts, subscriptions, or external tracking. New features must not break this principle.
- **No new runtime dependencies without discussion.** The goal is a lightweight app with minimal `requirements.txt`. Open an issue first if you need to add a dependency.
- **Test your changes** across both dark and light themes, and on mobile viewport widths (≤ 480 px).

---

## What to Contribute

Good areas for contributions:

- 🐛 Bug fixes
- 🌐 New exchange or data-source integrations (price fetching, stocks, forex)
- 🌍 i18n improvements (`static/i18n.js`)
- ♿ Accessibility improvements
- 📱 PWA / mobile UX refinements
- 🔒 Security hardening

---

## Pull Request Checklist

Before submitting a PR, please make sure:

- [ ] The app starts cleanly with `python3 app.py`
- [ ] No secrets, API keys, or personal data are committed
- [ ] The change works in both **dark** and **light** themes
- [ ] Code is readable and commented where non-obvious

---

## License

By contributing your code, you agree to license your contribution under the terms of the GPL-3.0 license.  
All files are released under the **GNU General Public License v3.0**.
