# KudiFlow 3–5 Minute Reviewer Demo Script

> **Step-by-step presentation flow for demonstrating KudiFlow's challenge readiness and financial correctness.**

---

### Phase 1: Introduction & Architecture (0:00 – 0:45)
* **Goal**: Establish the context, engineering philosophy, and architectural rigor.
* **Talking Points**:
  * "KudiFlow is a Ghana-context digital wallet prototype built for the 72-hour technical challenge."
  * "Rather than treating money as simple database CRUD, KudiFlow is architected as an authoritative financial ledger."
  * "Balances are never calculated on the client. Every transfer uses PostgreSQL pessimistic row locking, exact integer pesewas arithmetic, mandatory 4-digit PIN authorization, and cryptographic idempotency protection."

---

### Phase 2: Login & Baseline Ledger Verification (0:45 – 1:30)
* **Goal**: Demonstrate real database persistence and clean starting balances.
* **Actions**:
  1. Open the mobile app. The Onboarding screen introduces the platform.
  2. Tap **Login** → Enter demo credentials:
     * Phone: `+233 24 555 0192`
     * Password: `KudiFlow2024!`
  3. The Home screen mounts and fetches live data from the server (`GET /api/users/me/account`).
* **Talking Points**:
  * "Notice Ama Mensah's starting wallet balance: **GH₵ 4,850.00**."
  * "This number comes directly from our Neon PostgreSQL database via a secure Bearer JWT session stored in `expo-secure-store`."
  * "There are zero mock balances or dummy transaction lists on this screen."

---

### Phase 3: The Ama → Kwame Core Acceptance Transfer (1:30 – 2:45)
* **Goal**: Execute the definitive challenge transfer and demonstrate end-to-end correctness.
* **Actions**:
  1. Tap the green **Send** quick action square.
  2. Select **Kwame Asante** (`+233 24 410 0200`).
  3. Enter amount: `500.00`.
  4. Notice the review breakdown:
     * Transfer Amount: `GH₵ 500.00`
     * Transfer Fee: `GH₵ 2.00` (server fee schedule for transfers over GH₵ 50.00)
     * Total Deduction: `GH₵ 502.00`
  5. Swipe the **"Slide to Send"** bar to the right.
  6. The tactile PIN modal slides up.
  7. Enter incorrect PIN `9999` → Notice immediate rejection with error prompt and zero balance deduction.
  8. Enter correct PIN `1234` → The app displays the processing screen and transitions to the Success screen.
  9. Show the completed receipt: Reference `TXN-...`, Amount `GH₵ 500.00`, Fee `GH₵ 2.00`, Status `COMPLETED`.
* **Talking Points**:
  * "The slider doesn't execute the payment blindly; it triggers a mandatory 4-digit PIN verification."
  * "The backend verified Ama's bcrypt PIN hash, acquired pessimistic row locks on Ama and Kwame's accounts, verified the balance, debited GH₵ 502.00, credited Kwame GH₵ 500.00, recorded the transaction, emitted an audit log, and committed the transaction."

---

### Phase 4: Ledger & Balance Verification (2:45 – 3:30)
* **Goal**: Prove that the database state updated correctly across the entire application.
* **Actions**:
  1. Tap **Done** on the Success screen to return to the Home dashboard.
  2. Observe Ama's updated balance: **GH₵ 4,348.00** (exactly `4,850.00 - 502.00`).
  3. Look at the Recent Transactions list: the new transfer appears at the top.
  4. Tap the transaction row to view the **Transaction Details** screen.
  5. Show that the reference, amount, fee, sender, recipient, and status match identically.
* **Talking Points**:
  * "Notice how the exact same reference and numbers appear on Home, Success, and Transaction Details."
  * "If we query Kwame's balance in the database, it has increased from GH₵ 2,100.00 to exactly **GH₵ 2,600.00**."

---

### Phase 5: Additional Challenge Features & Safeguards (3:30 – 4:30)
* **Actions**:
  1. Tap **Add money** → Demonstrate the Prototype Sandbox Rail modal and deposit GH₵ 200.00. Balance updates instantly to GH₵ 4,548.00.
  2. Tap **Pay Bills** → Select ECG Prepaid Electricity, enter meter number, and review the GH₵ 1.00 fee.
  3. Tap **Request** → Show the outbound request creation and the "Incoming" tab where pending peer requests can be authorized or declined.
  4. Tap the **Security Sandbox** card to review the architectural guarantees.
* **Talking Points**:
  * "All 4 quick actions on the Home screen are functional."
  * "Add Money is clearly labelled as a prototype settlement rail that debits an internal reserve account, allowing reviewers to test deposit flows safely."

---

### Phase 6: Conclusion & Test Evidence (4:30 – 5:00)
* **Talking Points**:
  * "KudiFlow has 38 out of 38 automated tests passing across 5 test suites covering atomicity, idempotency replay, payload tampering, concurrency, and authentication."
  * "Both the server and mobile workspaces pass TypeScript type checking with 0 errors."
  * "Thank you for reviewing KudiFlow."
