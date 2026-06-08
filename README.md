# Gemini × Swedish Bank — A2A Mortgage Transfer Demo

A client-side demo showing **Gemini** coordinating a full mortgage transfer with **Swedish Bank** using the **Agent-to-Agent (A2A)** protocol, **Universal Commerce Protocol (UCP)** for rate discovery, and **Agent Payments Protocol (AP2)** for secure financial execution.

Everything runs in the browser — no API keys, no backend services required. The demo simulates the exact information flow, visual widgets, and decision points as they would transition between agents and the user in production.

> **Disclaimer**: This is a simulation/demo — no real banking connections are made. "Swedish Bank" is a fictional entity. All data shown (rates, credit reports, etc.) is mock data for demonstration purposes only.

---

## Quick Start

```bash
# 1. Clone the repo
git clone <repo-url> && cd gemini-bank-integration

# 2. Start the server
python3 server.py

# 3. Open your browser
open http://localhost:8001
```

That's it — no API keys, no dependencies, no build step. Just Python 3 and a browser.

---

## Demo Walkthrough

### 1. Start the flow

Type a mortgage-related prompt, for example:

> *"I want to transfer my mortgage of 2,800,000 SEK at 4.15% on Hantverkargatan 14, Stockholm"*

Or click one of the quick-start cards on the welcome screen.

### 2. Answer qualifying questions

Gemini will ask for your **property value** and **preferred binding period** (variable or fixed). Answer naturally.

### 3. Rate comparison

Gemini queries rates from SEB, Nordea, Handelsbanken, and Swedish Bank via UCP and displays a comparison grid.

### 4. A2A handoff to Banksy

Gemini establishes an Agent-to-Agent connection with Swedish Bank's mortgage agent (Banksy) and hands off the process.

### 5. BankID verification

Click **"Open BankID"** and then **"I've signed"** to simulate mobile BankID authentication.

### 6. Credit report

Banksy pulls a UC Riskprognos credit report — showing risk category, existing loans, taxed income, and debt-to-income ratio.

### 7. Salary document upload

Upload salary documents (simulated) or type **"skip"** to continue without them.

### 8. Personalized rate offer

Banksy runs a KALP affordability assessment and presents your personalized rate at **3.89%** with a savings breakdown vs. your current bank.

### 9. Additional offers

Banksy asks if you'd like to explore further rate reductions by consolidating banking services.

### 10. Digital signing

Type your name and sign the mortgage transfer agreement via BankID. AP2 processes the interbank clearing.

### 11. Completion

Transfer confirmed with a 1–2 week settlement timeline.

---

## Protocol Architecture

### A2A (Agent-to-Agent)
Enables Gemini ↔ Banksy communication. Gemini discovers Swedish Bank's agent, authenticates, and delegates the mortgage process. Banksy operates independently on Swedish Bank's infrastructure.

### UCP (Universal Commerce Protocol)
Powers financial product discovery. Gemini queries standardized rate inventories across Swedish banks in real-time. Also used when Banksy fetches personalized pricing from the bank's internal engine.

### AP2 (Agent Payments Protocol)
Handles secure financial execution: cryptographic payment authorization, interbank clearing house transactions, and settlement registration.

---

## Financial Parameters

| Parameter | Value |
|-----------|-------|
| Default loan amount | 2,800,000 SEK |
| Default current rate | 4.15% |
| Swedish Bank offered rate | 3.89% (variable) |
| Full customer discount | −0.20pp (to 3.69%) |
| Bolånetak (max LTV) | 90% |
| Amortization: LTV > 70% | 2% per year |
| Amortization: LTV 50–70% | 1% per year |
| Amortization: LTV ≤ 50% | 0% |
| Transfer timeline | 1–2 weeks |

---

## Project Structure

```
gemini-bank-integration/
├── index.html          # Page structure, welcome screen, chat layout
├── demo.js             # Flow logic, state machine, widget rendering, financial calculations
├── styles.css          # Full design system (~3100 lines)
├── server.py           # Simple HTTP server (port 8001)
├── gemini-logo.png     # Gemini avatar for chat messages
├── bankid_logo.png     # BankID branding for verification widgets
└── bankid_qr.png       # BankID QR code for authentication widget
```

---

## Easter Eggs

Try typing these in the chat:
- *"Why is my code working?"*
- *"How to bribe my cat"*
- *"Can I pay with Monopoly money?"*
