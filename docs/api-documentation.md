# KudiFlow REST API Documentation

> **Base URL**: `http://localhost:3000` (Local) / `http://<LAN-IP>:3000` (Physical Device)  
> **Protocol**: HTTPS / HTTP REST with JSON payloads  
> **Authentication**: Bearer JWT (`Authorization: Bearer <token>`)

---

## 1. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/register`
Creates a new pending user and sends an initial verification OTP.

* **Auth**: None
* **Request Body**:
  ```json
  {
    "fullName": "Ama Mensah",
    "phone": "+233245550192",
    "email": "ama.mensah@kudiflow.gh",
    "password": "Password123!"
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "userId": "11111111-1111-1111-1111-111111111111",
      "status": "PENDING_VERIFICATION",
      "message": "Registration successful. Please verify your phone number."
    }
  }
  ```
* **Errors**: `409 Conflict` (`PHONE_ALREADY_EXISTS`, `EMAIL_ALREADY_EXISTS`), `422 Unprocessable` (`VALIDATION_ERROR`).

---

### `POST /api/auth/verify-otp`
Verifies user phone with the 6-digit OTP code.

* **Auth**: None
* **Request Body**:
  ```json
  {
    "userId": "11111111-1111-1111-1111-111111111111",
    "code": "123456",
    "purpose": "PHONE_VERIFICATION"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1...",
      "refreshToken": "eyJhbGciOiJIUzI1...",
      "status": "ACTIVE"
    }
  }
  ```
* **Errors**: `400 Bad Request` (`INVALID_OTP`, `OTP_EXPIRED`, `MAX_ATTEMPTS_EXCEEDED`).

---

### `POST /api/auth/set-pin`
Sets or updates the user's mandatory 4-digit transaction PIN.

* **Auth**: Bearer JWT
* **Request Body**:
  ```json
  {
    "pin": "1234",
    "confirmPin": "1234"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": { "message": "Transaction PIN set successfully." }
  }
  ```
* **Errors**: `422 Unprocessable` (`PIN_MISMATCH`, `WEAK_PIN`).

---

### `POST /api/auth/login`
Authenticates a user via phone/email and password.

* **Auth**: None
* **Request Body**:
  ```json
  {
    "identifier": "+233245550192",
    "password": "KudiFlow2024!"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "11111111-1111-1111-1111-111111111111",
        "full_name": "Ama Mensah",
        "phone": "+233245550192",
        "email": "ama.mensah@kudiflow.gh",
        "status": "ACTIVE"
      },
      "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsIn..."
    }
  }
  ```
* **Errors**: `401 Unauthorized` (`INVALID_CREDENTIALS`), `403 Forbidden` (`ACCOUNT_SUSPENDED`).

---

### `POST /api/auth/refresh`
Rotates access token using a valid refresh token.

* **Auth**: None
* **Request Body**: `{ "refreshToken": "eyJhbGciOiJIUzI1..." }`
* **Response (200 OK)**: `{ "success": true, "data": { "accessToken": "..." } }`
* **Errors**: `401 Unauthorized` (`INVALID_REFRESH_TOKEN`).

---

## 2. User & Wallet Endpoints (`/api/users`)

### `GET /api/users/me`
Fetches current authenticated user profile.
* **Auth**: Bearer JWT
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "11111111-1111-1111-1111-111111111111",
      "fullName": "Ama Mensah",
      "phone": "+233245550192",
      "email": "ama.mensah@kudiflow.gh",
      "status": "ACTIVE",
      "hasPin": true
    }
  }
  ```

---

### `GET /api/users/me/account`
Fetches user account balance and wallet details directly from PostgreSQL.
* **Auth**: Bearer JWT
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "account": {
        "accountNumber": "2055019201",
        "balance": "4850.00",
        "currency": "GHS",
        "status": "ACTIVE"
      }
    }
  }
  ```

---

## 3. Transaction Endpoints (`/api/transactions`)

### `POST /api/transactions`
Executes an atomic transfer from authenticated user to recipient.

* **Auth**: Bearer JWT
* **Required Header**: `Idempotency-Key: <unique-uuid-string>`
* **Request Body**:
  ```json
  {
    "recipientPhone": "+233244100200",
    "amount": "500.00",
    "pin": "1234",
    "note": "Payment for goods"
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "transaction": {
        "id": "77777777-7777-7777-7777-777777777777",
        "reference": "TXN-20260910-ABC123",
        "amount": "500.00",
        "fee": "2.00",
        "total_amount": "502.00",
        "currency": "GHS",
        "type": "TRANSFER",
        "status": "COMPLETED",
        "sender_name": "Ama Mensah",
        "recipient_name": "Kwame Asante"
      },
      "fee": "2.00",
      "totalDebited": "502.00",
      "cached": false
    }
  }
  ```
* **Errors**:
  * `400 Bad Request`: `SELF_TRANSFER`, `VALIDATION_ERROR`.
  * `401 Unauthorized`: `INVALID_PIN`, `PIN_NOT_SET`.
  * `404 Not Found`: `RECIPIENT_NOT_FOUND`.
  * `409 Conflict`: `IDEMPOTENCY_KEY_REUSED` (when reused with different parameters).
  * `422 Unprocessable`: `INSUFFICIENT_FUNDS`.

---

### `POST /api/transactions/deposit`
Simulates sandbox funding into user wallet directly from the Settlement Reserve account.

* **Auth**: Bearer JWT
* **Required Header**: `Idempotency-Key: <unique-uuid-string>`
* **Request Body**:
  ```json
  {
    "amount": "200.00",
    "fundingMethod": "MTN_MOMO",
    "fundingReference": "DEP-MOMO-98124"
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "transaction": {
        "reference": "KDF-DEP-84729104",
        "amount": "200.00",
        "fee": "0.00",
        "total_amount": "200.00",
        "status": "COMPLETED"
      },
      "cached": false,
      "fee": "0.00",
      "totalDebited": "200.00"
    }
  }
  ```

---

### `POST /api/transactions/bill-pay`
Settles utility bill payments to official billing accounts (ECG, GWCL, MTN Fiber, DSTV).

* **Auth**: Bearer JWT
* **Required Header**: `Idempotency-Key: <unique-uuid-string>`
* **Request Body**:
  ```json
  {
    "billerCode": "ECG",
    "customerNumber": "142098442",
    "amount": "50.00",
    "pin": "1234"
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "transaction": {
        "reference": "KDF-BILL-91823741",
        "amount": "50.00",
        "fee": "1.00",
        "total_amount": "51.00",
        "status": "COMPLETED"
      },
      "fee": "1.00",
      "totalDebited": "51.00"
    }
  }
  ```
* **Errors**: `401 Unauthorized` (`INVALID_PIN`), `422 Unprocessable` (`INSUFFICIENT_FUNDS`, `VALIDATION_ERROR`).

---

### `GET /api/transactions`
Retrieves paginated transactions for the authenticated user.
* **Auth**: Bearer JWT
* **Query Params**: `filter` (`sent` | `received` | `all`), `limit`, `offset`
* **Response (200 OK)**: Returns `{ "success": true, "data": { "transactions": [...] } }`

---

### `GET /api/transactions/:id`
Fetches a single transaction by UUID.
* **Auth**: Bearer JWT (Enforces ownership check: requester must be sender or recipient)
* **Response (200 OK)**: Returns full transaction record with joined sender/recipient names.
* **Errors**: `403 Forbidden` (`FORBIDDEN`), `404 Not Found` (`TRANSACTION_NOT_FOUND`).

---

### `GET /api/transactions/:id/status`
Lightweight polling endpoint to verify transaction outcome during network uncertainty.
* **Auth**: Bearer JWT
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "77777777-7777-7777-7777-777777777777",
      "reference": "TXN-20260910-ABC123",
      "status": "COMPLETED",
      "amount": "500.00",
      "completedAt": "2026-09-10T09:40:00Z",
      "failureReason": null
    }
  }
  ```

---

### `POST /api/transactions/:id/reverse`
Executes an atomic reversal of a completed transaction, crediting funds back to the sender.
* **Auth**: Bearer JWT (Sender only)
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "transaction": {
        "reference": "REV-20260910-XYZ789",
        "type": "REVERSAL",
        "status": "COMPLETED"
      }
    }
  }
  ```
* **Errors**: `400 Bad Request` (`ALREADY_REVERSED`), `403 Forbidden` (`UNAUTHORIZED`).

---

## 4. Payment Requests Endpoints (`/api/payment-requests`)

### `POST /api/payment-requests`
Creates an outbound payment request.
* **Auth**: Bearer JWT
* **Request Body**:
  ```json
  {
    "payerPhone": "+233244100200",
    "amount": "50.00",
    "note": "Lunch split"
  }
  ```
* **Response (201 Created)**: Returns created payment request record.

---

### `GET /api/payment-requests`
Lists pending payment requests.
* **Auth**: Bearer JWT
* **Query Params**: `type` (`inbound` | `outbound`), `status` (`PENDING` | `PAID` | `DECLINED`)
* **Response (200 OK)**: Returns `{ "success": true, "data": { "paymentRequests": [...] } }`

---

### `POST /api/payment-requests/:id/pay`
Pays an inbound payment request using the authenticated user's PIN.
* **Auth**: Bearer JWT
* **Headers**: `Idempotency-Key`
* **Request Body**: `{ "pin": "1234" }`
* **Response (200 OK)**: Returns completed transaction record and sets request status to `PAID`.

---

## 5. System Health (`/health`)

### `GET /health`
Validates backend server and active PostgreSQL connectivity.
* **Auth**: None
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "status": "ok",
      "database": "connected",
      "timestamp": "2026-09-10T10:00:00.000Z",
      "version": "1.0.0"
    }
  }
  ```
