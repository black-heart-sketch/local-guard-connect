# CrimeX Cameroon — UML Diagram Specifications

## 1. Document purpose

This document specifies the UML model of the CrimeX Cameroon community-safety platform. It is based on the current React/Vite client, Express API, MongoDB/Mongoose models, continuous emergency WebSocket recording, and DigiPay Mobile Money integration.

All diagrams use PlantUML. Copy any `plantuml` code block into a PlantUML renderer or use a PlantUML extension in an IDE.

## 2. Scope and conventions

### 2.1 System scope

CrimeX supports:

- bilingual citizen access in English and French;
- authenticated and anonymous incident reporting;
- evidence upload and confidential report tracking;
- operator triage, assignment, dispatch, and resolution;
- emergency alerts with location and continuous private video recording;
- community posts and moderation;
- verified agency administration;
- notifications, SMS/USSD/WhatsApp channel events, and browser push;
- optional DigiPay contributions through MTN or Orange Cameroon numbers;
- privacy requests, auditing, retention, and legal holds.

### 2.2 Main actors

| Actor | Responsibility |
|---|---|
| Visitor | Views public information, submits an anonymous report, and tracks it with a recovery code. |
| Citizen | Manages a profile, reports incidents, activates emergencies, tracks cases, and makes optional contributions. |
| Dispatcher | Triages reports, assigns responders/agencies, manages emergencies, and sends notifications. |
| Responder | Police, gendarmerie, fire, medical, council, or NGO user who handles assigned cases. |
| Administrator | Manages users, agencies, moderation, payments, payouts, and system oversight. |
| Trusted Contact | Receives an SMS when an authenticated citizen activates an emergency. |
| DigiPay | External payment gateway for pay-ins, transaction status, balance, and payouts. |
| SMS/Push Service | Delivers trusted-contact SMS and targeted browser notifications. |

### 2.3 Matched behavioural diagram sets

The same three workflows are used for the specific use-case, sequence, activity, and communication diagrams.

| Set | Specific use case | Sequence | Activity | Communication |
|---|---|---|---|---|
| A | Submit and process incident report | SQ-01 | ACT-01 | COM-01 |
| B | Activate emergency and record video | SQ-02 | ACT-02 | COM-02 |
| C | Make optional Mobile Money contribution | SQ-03 | ACT-03 | COM-03 |

---

## 3. General use-case diagram

### UC-GEN-01 — CrimeX system overview

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false

actor Visitor
actor Citizen
actor "Operational User" as Operational
actor Dispatcher
actor "Operational Responder" as Responder
actor Administrator as Admin
actor "Trusted Contact" as Contact
actor DigiPay
actor "SMS / Push Service" as Messaging

Operational <|-- Dispatcher
Operational <|-- Responder
Operational <|-- Admin

rectangle "CrimeX Cameroon" {
  usecase "Register / Sign in\n(password or phone OTP)" as UCAuth
  usecase "Manage profile and\ntrusted contacts" as UCProfile
  usecase "Submit incident report" as UCReport
  usecase "Attach private evidence" as UCEvidence
  usecase "Track report" as UCTrack
  usecase "View privacy-safe map" as UCMap
  usecase "Activate emergency" as UCEmergency
  usecase "Stream emergency video" as UCStream
  usecase "Notify trusted contacts" as UCContacts
  usecase "Triage and assign report" as UCTriage
  usecase "Update case status" as UCStatus
  usecase "Watch protected\nemergency recording" as UCWatch
  usecase "Manage users and agencies" as UCManage
  usecase "Publish notifications" as UCNotify
  usecase "Participate in community" as UCCommunity
  usecase "Moderate community content" as UCModerate
  usecase "Make optional contribution" as UCPayment
  usecase "Check payment status" as UCPaymentStatus
  usecase "Manage balance and payout" as UCPayout
  usecase "Request data rights" as UCPrivacy
  usecase "Record audit event" as UCAudit
}

Visitor --> UCReport
Visitor --> UCTrack
Visitor --> UCMap
Visitor --> UCEmergency

Citizen --> UCAuth
Citizen --> UCProfile
Citizen --> UCReport
Citizen --> UCTrack
Citizen --> UCMap
Citizen --> UCEmergency
Citizen --> UCCommunity
Citizen --> UCPayment
Citizen --> UCPaymentStatus
Citizen --> UCPrivacy

Dispatcher --> UCTriage
Dispatcher --> UCWatch
Dispatcher --> UCNotify

Responder --> UCWatch
Operational --> UCStatus

Admin --> UCManage
Admin --> UCModerate
Admin --> UCNotify
Admin --> UCPayout

UCReport .> UCEvidence : <<include>>
UCEmergency .> UCStream : <<extend>>
UCEmergency .> UCContacts : <<extend>>
UCTriage .> UCStatus : <<include>>
UCPayment .> UCPaymentStatus : <<extend>>

Contact <-- UCContacts
DigiPay <-- UCPayment
DigiPay <-- UCPaymentStatus
DigiPay <-- UCPayout
Messaging <-- UCContacts
Messaging <-- UCNotify

UCReport .> UCAudit : <<include>>
UCTriage .> UCAudit : <<include>>
UCWatch .> UCAudit : <<include>>
UCPayment .> UCAudit : <<include>>
UCPayout .> UCAudit : <<include>>
@enduml
```

---

## 4. Specific use-case diagrams and specifications

## 4.1 UC-01 — Submit and process an incident report

### Specification

| Field | Description |
|---|---|
| Primary actor | Citizen or Visitor |
| Supporting actors | Dispatcher, Responder, verified Agency, Push Service |
| Goal | Create a confidential incident record and progress it to a final operational decision. |
| Trigger | The reporter selects “Report an incident.” |
| Preconditions | The platform is available; category, description, and location can be supplied. Authentication is optional. |
| Success postcondition | A report with a Cameroon reference, timeline, retention date, and initial `received` status is stored. |
| Anonymous postcondition | The reporter receives a one-time recovery code; only its hash is stored. |
| Failure postcondition | No incomplete report is stored; validation or duplicate-offline-submission error is returned. |

### Main success flow

1. Reporter opens the report form.
2. Reporter chooses authenticated or anonymous reporting.
3. Reporter enters category, severity, description, landmark/address, jurisdiction, and optional coordinates.
4. Reporter optionally attaches up to six evidence files.
5. The system validates required fields and evidence constraints.
6. For anonymous reporting, the system generates or validates a recovery code and stores only its hash.
7. The system stores the report with status `received` and a timeline entry.
8. The system creates a jurisdiction notification and audit entry.
9. The system returns the report reference and, when anonymous, the recovery code.
10. A dispatcher triages the report and assigns a verified agency or responder.
11. The assigned responder receives an in-app/browser notification.
12. Authorized staff update the report until it is resolved or rejected.

### Alternate and exception flows

- **A1 — Offline submission:** the client stores a submission locally and later sends it with a unique `clientSubmissionId`.
- **A2 — Duplicate offline submission:** the API returns HTTP 409 and does not create another report.
- **A3 — Invalid required data:** the API returns HTTP 400.
- **A4 — Anonymous tracking:** the reporter supplies the reference and recovery code; the API compares its hash.
- **A5 — Invalid recovery code:** access is denied without revealing report contents.
- **A6 — Agency not verified:** assignment is rejected.
- **A7 — Sensitive report:** it remains excluded from the public map.

### Diagram

```plantuml
@startuml
left to right direction
skinparam shadowing false
actor Reporter
actor Dispatcher
actor Responder
actor "Verified Agency" as Agency
actor "Push Service" as Push

rectangle "Incident Reporting" {
  usecase "Enter incident details" as U1
  usecase "Choose anonymous mode" as U2
  usecase "Attach evidence" as U3
  usecase "Validate submission" as U4
  usecase "Generate reference and\nrecovery code" as U5
  usecase "Store report and timeline" as U6
  usecase "Track report" as U7
  usecase "Triage report" as U8
  usecase "Assign verified agency\nor responder" as U9
  usecase "Notify assignee" as U10
  usecase "Update report status" as U11
}

Reporter --> U1
Reporter --> U2
Reporter --> U3
Reporter --> U7
U1 .> U4 : <<include>>
U2 .> U5 : <<extend>>
U4 .> U6 : <<include>>
Dispatcher --> U8
Dispatcher --> U9
U9 .> U10 : <<include>>
Agency --> U9
Responder --> U11
Push <-- U10
@enduml
```

## 4.2 UC-02 — Activate an emergency and record video

### Specification

| Field | Description |
|---|---|
| Primary actor | Citizen or Visitor |
| Supporting actors | Dispatcher/Responder, Trusted Contact, SMS Service |
| Goal | Store an emergency alert immediately and, with consent, transfer one continuous private recording. |
| Trigger | The user activates the emergency control and confirms recording/location permissions. |
| Preconditions | Browser camera support is available for video; an alert may still be created without a recording. |
| Success postcondition | The emergency is queued; a completed recording is stored privately; operators can watch it after authorization. |
| Guest postcondition | A recovery code is returned and required for the recording stream. |
| Failure postcondition | An interrupted or rejected partial file is removed and no incomplete recording remains attached. |

### Main success flow

1. User activates the emergency control.
2. Client requests camera/microphone and location permissions.
3. Client creates a unique recording session ID.
4. API stores an emergency with `queued` status and a retention date.
5. For a guest, the API generates a recovery code; for a citizen, the authenticated user owns the alert.
6. The system attempts SMS notifications to enabled trusted contacts.
7. The system creates a dispatcher notification.
8. Client opens the emergency WebSocket only for this recording session.
9. Client authenticates the socket using the bearer token or recovery code.
10. Client transfers MediaRecorder bytes continuously.
11. User presses Stop.
12. Client stops tracks and sends `complete` after buffered bytes drain.
13. Server finalizes the private recording and updates its size/completion time.
14. An authorized operator opens the emergency log and watches the recording through protected HTTP range requests.

### Alternate and exception flows

- **B1 — Permission denied:** create the alert if possible, show official Cameroon emergency numbers, and omit video/location not consented to.
- **B2 — Invalid stream authentication:** close the socket and delete temporary data.
- **B3 — Recording exceeds configured limit:** reject the stream and delete the partial file.
- **B4 — Network disconnect before completion:** clean up the partial recording.
- **B5 — Duplicate recording:** reject a second stream for the same emergency.
- **B6 — Invalid playback authorization:** return HTTP 403.
- **B7 — Seeking:** return HTTP 206 with the requested byte range.

### Diagram

```plantuml
@startuml
left to right direction
skinparam shadowing false
actor User
actor "Trusted Contact" as Contact
actor Dispatcher
actor "Authorized Operator" as Operator
actor "SMS Service" as SMS

rectangle "Emergency Response" {
  usecase "Activate emergency" as E1
  usecase "Request camera, microphone\nand location consent" as E2
  usecase "Create queued alert" as E3
  usecase "Generate guest recovery code" as E4
  usecase "Notify trusted contacts" as E5
  usecase "Open authenticated WebSocket" as E6
  usecase "Transfer continuous video" as E7
  usecase "Stop and finalize recording" as E8
  usecase "Acknowledge / dispatch / complete" as E9
  usecase "Watch protected recording" as E10
  usecase "Request video byte range" as E11
}

User --> E1
E1 .> E2 : <<include>>
E1 .> E3 : <<include>>
E4 .> E3 : <<extend>>
E5 .> E3 : <<extend>>
E2 .> E6 : <<include>>
E6 .> E7 : <<include>>
E7 .> E8 : <<include>>
SMS <-- E5
Contact <-- E5
Dispatcher --> E9
Operator --> E10
E10 .> E11 : <<include>>
@enduml
```

## 4.3 UC-03 — Make an optional Mobile Money contribution

### Specification

| Field | Description |
|---|---|
| Primary actor | Authenticated Citizen |
| Supporting actors | DigiPay, MTN Mobile Money or Orange Money, Administrator |
| Goal | Make an optional donation or organization subscription payment in XAF. |
| Trigger | Citizen selects a contribution purpose and enters payment details. |
| Preconditions | User is authenticated; payment is not required for incident reporting. |
| Success postcondition | A payment record contains its CrimeX reference, DigiPay transaction ID, amounts, and final status. |
| Failure postcondition | Validation failure prevents gateway initiation; gateway failure is retained as a failed transaction when applicable. |

### Main success flow

1. Citizen chooses `donation` or `organization_subscription`.
2. Citizen selects MTN or Orange and enters a Cameroon mobile number and amount.
3. API normalizes the number to `2376XXXXXXXX`.
4. API validates provider, purpose, phone, and minimum amount of 100 XAF.
5. API stores a pending payment with a `PAY-...` reference.
6. API asks DigiPay to initiate a pay-in.
7. DigiPay sends a Mobile Money approval prompt to the customer.
8. API stores the transaction ID, gateway status, base amount, charged amount, and commission.
9. Citizen can request a transaction-status refresh.
10. DigiPay or the secured webhook supplies the final status.
11. The system displays `success`, `failed`, `cancelled`, or another valid state.

### Alternate and exception flows

- **C1 — Invalid phone:** reject any number not matching Cameroon `2376XXXXXXXX` after normalization.
- **C2 — Amount below 100 XAF:** return HTTP 400.
- **C3 — Unsupported provider or purpose:** return HTTP 400.
- **C4 — User declines or times out:** status becomes `failed` or `cancelled` according to DigiPay.
- **C5 — Development mode:** DigiPay service may mark the transaction as simulated.
- **C6 — Invalid webhook secret:** return HTTP 401 without changing the payment.
- **C7 — Admin settlement:** an administrator may check merchant balance or request a payout to a Cameroon number.

### Diagram

```plantuml
@startuml
left to right direction
skinparam shadowing false
actor Citizen
actor Administrator as Admin
actor DigiPay
actor "MTN / Orange Mobile Money" as MoMo

rectangle "Optional Contribution" {
  usecase "Enter contribution details" as P1
  usecase "Validate Cameroon phone,\nprovider, purpose and amount" as P2
  usecase "Create pending payment" as P3
  usecase "Initiate DigiPay pay-in" as P4
  usecase "Approve Mobile Money prompt" as P5
  usecase "Refresh transaction status" as P6
  usecase "Receive secured webhook" as P7
  usecase "View contribution history" as P8
  usecase "Check merchant balance" as P9
  usecase "Request merchant payout" as P10
}

Citizen --> P1
P1 .> P2 : <<include>>
P2 .> P3 : <<include>>
P3 .> P4 : <<include>>
DigiPay <-- P4
P4 .> P5 : <<include>>
MoMo <-- P5
Citizen --> P6
DigiPay <-- P6
DigiPay --> P7
Citizen --> P8
Admin --> P9
Admin --> P10
DigiPay <-- P9
DigiPay <-- P10
@enduml
```

---

## 5. Sequence diagrams

## 5.1 SQ-01 — Submit and process incident report

```plantuml
@startuml
autonumber
actor Reporter
boundary "React Report UI" as UI
control "Report Route" as Route
control "Report Controller" as Controller
database "MongoDB" as DB
control "Notification Service" as Notification
control "Audit Service" as Audit
actor Dispatcher
control "Push Service" as Push
actor Responder

Reporter -> UI: Enter incident, location and optional evidence
UI -> Route: POST /api/reports (multipart form)
Route -> Controller: createReport(req)
Controller -> Controller: Validate fields and anonymity
alt invalid submission
  Controller --> UI: 400 validation error
else valid submission
  Controller -> Controller: Hash evidence and recovery code
  Controller -> DB: Create Report(received, timeline, retention)
  DB --> Controller: Stored report
  Controller -> DB: Create jurisdiction Notification
  Controller -> Audit: report.create
  Controller --> UI: 201 reference + optional recovery code
  UI --> Reporter: Show reference and recovery instructions
end

Dispatcher -> UI: Open operational dashboard
UI -> Route: PATCH /api/reports/{id}/assign
Route -> Controller: assignReport(req)
Controller -> DB: Verify agency
alt agency is not verified
  Controller --> UI: 400 verified agency required
else valid assignment
  Controller -> DB: Set assignee/agency and status=assigned
  Controller -> DB: Create targeted notification
  Controller -> Push: Notify assigned responder
  Controller -> Audit: report.assign
  Controller --> UI: Updated report
  Push --> Responder: Case assignment notification
end
@enduml
```

## 5.2 SQ-02 — Activate emergency and record/watch video

```plantuml
@startuml
autonumber
actor User
boundary "Emergency UI" as UI
control "MediaRecorder" as Media
control "Emergency API" as API
database "MongoDB" as DB
control "SMS Service" as SMS
control "WebSocket Stream Handler" as WS
collections "Private Recording Storage" as Storage
actor "Trusted Contact" as Contact
actor Operator
boundary "Emergency Log Player" as Player

User -> UI: Activate emergency
UI -> User: Request camera/microphone/location consent
User --> UI: Permission decision
UI -> API: POST /api/emergencies(sessionId, type, location)
API -> DB: Create Emergency(status=queued)
opt authenticated user has trusted contacts
  API -> SMS: Send emergency SMS
  SMS --> Contact: Emergency reference and official numbers
  API -> DB: Record notification attempt
end
API -> DB: Create dispatcher notification
API --> UI: 201 emergency + optional recovery code

UI -> WS: Connect /stream-socket
UI -> WS: authenticate(token or recoveryCode, mimeType)
WS -> DB: Find and authorize emergency
WS -> Storage: Open temporary recording file
WS --> UI: ready
UI -> Media: start()
loop while recording
  Media --> UI: encoded bytes
  UI -> WS: binary frame
  WS -> Storage: append bytes
end
User -> UI: Press Stop
UI -> Media: stop() and stop tracks
Media --> UI: final encoded bytes
UI -> WS: complete
WS -> Storage: finalize temporary file
WS -> DB: Save size and completedAt
WS --> UI: completed

Operator -> Player: Open emergency detail
Player -> API: GET /api/emergencies/{id}/recording\nRange: bytes=start-end
API -> DB: Authorize owner/operator/recovery code
API -> Storage: Read requested byte range
Storage --> API: Video bytes
API --> Player: 206 Partial Content
Player --> Operator: Play / pause / seek video
@enduml
```

## 5.3 SQ-03 — Make optional Mobile Money contribution

```plantuml
@startuml
autonumber
actor Citizen
boundary "Support Page" as UI
control "Payment Route" as Route
control "Payment Controller" as Controller
database "MongoDB" as DB
control "DigiPay Service" as Service
participant "DigiPay SDK" as SDK
participant "MTN / Orange Money" as MoMo
control "Audit Service" as Audit

Citizen -> UI: Select purpose, provider, phone and amount
UI -> Route: POST /api/payments
Route -> Controller: createPayment(req)
Controller -> Controller: Normalize and validate input
alt invalid Cameroon phone/provider/purpose/amount
  Controller --> UI: 400 validation error
else valid contribution
  Controller -> DB: Create Payment(status=pending)
  Controller -> Service: initiatePayin(details)
  Service -> SDK: client.payments.initiate(...)
  SDK -> MoMo: Send approval prompt
  MoMo --> Citizen: Confirm transaction on phone
  SDK --> Service: transactionId, status and charges
  Service --> Controller: Normalized gateway result
  Controller -> DB: Save external reference and amounts
  Controller -> Audit: payment.create
  Controller --> UI: 201 Payment
end

Citizen -> UI: Refresh payment status
UI -> Route: GET /api/payments/{reference}/status
Route -> Controller: refreshPaymentStatus(req)
Controller -> DB: Find authorized payment
Controller -> Service: getTransactionStatus(transactionId)
Service -> SDK: client.payments.getStatus(transactionId)
SDK --> Service: latest status
Service --> Controller: normalized result
Controller -> DB: Update status and charges
Controller --> UI: Updated payment
UI --> Citizen: Display final status
@enduml
```

---

## 6. Activity diagrams

## 6.1 ACT-01 — Submit and process incident report

Corresponds to **UC-01** and **SQ-01**.

```plantuml
@startuml
start
:Open incident form;
:Enter category, description and location;
if (Attach evidence?) then (yes)
  :Select up to six files;
  :Validate type and size;
endif
if (Report anonymously?) then (yes)
  :Generate or validate recovery code;
  :Hash recovery code;
else (no)
  :Associate authenticated reporter;
endif
:Validate required data;
if (Valid?) then (no)
  :Display validation error;
  stop
endif
:Hash and store evidence metadata;
:Create report with received status;
:Append initial timeline event;
:Create jurisdiction notification and audit entry;
:Return Cameroon reference;
if (Anonymous?) then (yes)
  :Show recovery code once;
endif
:Dispatcher reviews report;
if (Verified agency/responder available?) then (yes)
  :Assign report;
  :Send targeted notification;
  :Responder updates operational status;
  if (Resolved?) then (yes)
    :Mark resolved;
  else (rejected)
    :Record rejection reason;
  endif
else (no)
  :Keep report triaged for reassignment;
endif
stop
@enduml
```

## 6.2 ACT-02 — Activate emergency and record/watch video

Corresponds to **UC-02** and **SQ-02**.

```plantuml
@startuml
start
:User activates emergency;
:Display official Cameroon emergency numbers;
:Request location, camera and microphone permissions;
:Create unique recording session ID;
:POST emergency alert;
:Store queued emergency and dispatcher notification;
if (Authenticated with trusted contacts?) then (yes)
  :Attempt trusted-contact SMS;
endif
if (Guest?) then (yes)
  :Return recovery code;
endif
if (Camera permission granted?) then (no)
  :Keep emergency alert without video;
  stop
endif
:Open emergency WebSocket;
:Authenticate with token or recovery code;
if (Authorized and no existing recording?) then (no)
  :Close socket and remove temporary data;
  stop
endif
:Start MediaRecorder;
while (Stop not pressed and connection active?) is (recording)
  :Send encoded bytes;
  :Append bytes to private temporary file;
  if (Maximum size exceeded?) then (yes)
    :Reject stream and delete temporary file;
    stop
  endif
endwhile (stop/disconnect)
if (User pressed Stop normally?) then (yes)
  :Stop media tracks;
  :Send final bytes and complete message;
  :Finalize recording file;
  :Save size and completion time;
else (network failure)
  :Delete partial recording;
  stop
endif
:Operator opens emergency detail;
:Authorize recording access;
while (Video needs more data?) is (yes)
  :Request byte range;
  :Return 206 Partial Content;
endwhile (no)
:Operator watches or seeks recording;
stop
@enduml
```

## 6.3 ACT-03 — Make optional Mobile Money contribution

Corresponds to **UC-03** and **SQ-03**.

```plantuml
@startuml
start
:Authenticated citizen opens Support page;
:Choose donation or organization subscription;
:Choose MTN or Orange;
:Enter Cameroon phone and amount;
:Normalize phone number;
if (Phone matches 2376XXXXXXXX?) then (no)
  :Display invalid phone error;
  stop
endif
if (Amount >= 100 XAF?) then (no)
  :Display minimum amount error;
  stop
endif
:Create pending payment with PAY reference;
:Initiate DigiPay pay-in;
:Send Mobile Money prompt;
if (Customer approves?) then (yes)
  :Receive transaction identifier;
  :Store charged amount and commission;
  :Set gateway status;
else (declines/times out)
  :Store failed or cancelled status;
endif
:Citizen requests status refresh;
:Query DigiPay transaction status;
:Update local payment;
if (Successful?) then (yes)
  :Display contribution confirmation;
else (no)
  :Display pending or failure guidance;
endif
stop
@enduml
```

---

## 7. Communication diagrams

Communication diagrams use the same participants and numbered messages as their corresponding sequence diagrams.

## 7.1 COM-01 — Incident report communication

Corresponds to **SQ-01** and **ACT-01**.

```plantuml
@startuml
left to right direction
skinparam linetype ortho
object Reporter
object "React Report UI" as UI
object "Report Route" as Route
object "Report Controller" as Controller
database MongoDB as DB
object "Notification/Push Service" as Notify
object Dispatcher
object Responder

Reporter --> UI : 1: enterIncident(details, evidence)
UI --> Route : 2: POST /api/reports
Route --> Controller : 2.1: createReport(req)
Controller --> Controller : 2.2: validateAndHash()
Controller --> DB : 2.3: createReport(received)
Controller --> DB : 2.4: createJurisdictionNotification()
Controller --> DB : 2.5: createAuditLog()
Controller --> UI : 2.6: reference + recoveryCode?
UI --> Reporter : 3: showSubmissionResult()
Dispatcher --> UI : 4: chooseAssignee()
UI --> Route : 4.1: PATCH /reports/{id}/assign
Route --> Controller : 4.2: assignReport(req)
Controller --> DB : 4.3: verifyAgencyAndUpdateReport()
Controller --> Notify : 4.4: notifyAssignee()
Notify --> Responder : 4.5: caseAssigned(reference)
@enduml
```

## 7.2 COM-02 — Emergency recording communication

Corresponds to **SQ-02** and **ACT-02**.

```plantuml
@startuml
left to right direction
skinparam linetype ortho
object User
object "Emergency UI" as UI
object MediaRecorder as Media
object "Emergency API" as API
object "WebSocket Handler" as WS
database MongoDB as DB
collections "Private Storage" as Storage
object "SMS Service" as SMS
object "Video Player" as Player
object Operator

User --> UI : 1: activateEmergency()
UI --> User : 1.1: requestPermissions()
UI --> API : 2: createEmergency(session, location)
API --> DB : 2.1: saveQueuedEmergency()
API --> SMS : 2.2: notifyTrustedContacts()
API --> UI : 2.3: emergency + recoveryCode?
UI --> WS : 3: connectAndAuthenticate()
WS --> DB : 3.1: authorizeSession()
WS --> Storage : 3.2: openTemporaryFile()
WS --> UI : 3.3: ready
UI --> Media : 4: start()
Media --> UI : 4.1*: encodedBytes
UI --> WS : 4.2*: binaryFrame
WS --> Storage : 4.3*: appendBytes
User --> UI : 5: stop()
UI --> Media : 5.1: stopTracks()
UI --> WS : 5.2: complete
WS --> Storage : 5.3: finalizeFile()
WS --> DB : 5.4: saveRecordingMetadata()
Operator --> Player : 6: openRecording()
Player --> API : 6.1*: GET recording + Range
API --> DB : 6.2: authorizeOperator()
API --> Storage : 6.3: readByteRange()
API --> Player : 6.4: 206 Partial Content
@enduml
```

## 7.3 COM-03 — DigiPay contribution communication

Corresponds to **SQ-03** and **ACT-03**.

```plantuml
@startuml
left to right direction
skinparam linetype ortho
object Citizen
object "Support Page" as UI
object "Payment Route" as Route
object "Payment Controller" as Controller
database MongoDB as DB
object "DigiPay Service" as Service
object "DigiPay SDK" as SDK
object "MTN/Orange Money" as MoMo

Citizen --> UI : 1: enterContribution()
UI --> Route : 2: POST /api/payments
Route --> Controller : 2.1: createPayment(req)
Controller --> Controller : 2.2: normalizeAndValidate()
Controller --> DB : 2.3: createPendingPayment()
Controller --> Service : 2.4: initiatePayin()
Service --> SDK : 2.5: payments.initiate()
SDK --> MoMo : 2.6: requestCustomerApproval()
MoMo --> Citizen : 2.7: approvalPrompt
SDK --> Service : 2.8: transactionResult
Service --> Controller : 2.9: normalizedResult
Controller --> DB : 2.10: saveGatewayFields()
Controller --> UI : 2.11: payment
Citizen --> UI : 3: refreshStatus()
UI --> Route : 3.1: GET /payments/{reference}/status
Route --> Controller : 3.2: refreshPaymentStatus()
Controller --> Service : 3.3: getTransactionStatus()
Service --> SDK : 3.4: payments.getStatus()
SDK --> Service : 3.5: latestStatus
Controller --> DB : 3.6: updatePayment()
Controller --> UI : 3.7: updatedPayment
@enduml
```

---

## 8. State-machine diagrams

## 8.1 STM-01 — Incident report lifecycle

```plantuml
@startuml
hide empty description
[*] --> Received : valid submission stored
Received --> Triaged : operator reviews and classifies
Received --> Rejected : invalid / malicious / unusable
Triaged --> Assigned : verified agency or responder selected
Triaged --> Rejected : rejected after review
Assigned --> Dispatched : responder sent to case
Assigned --> ActionTaken : remote or administrative action
Dispatched --> ActionTaken : intervention recorded
ActionTaken --> Resolved : outcome confirmed
Dispatched --> Resolved : case concluded directly
Received --> Resolved : simple case resolved directly
Resolved --> [*]
Rejected --> [*]

note right of Received
  Initial timeline event is created.
  Anonymous access requires recovery code.
end note

note right of Resolved
  Public visibility is optional,
  delayed, and forbidden for sensitive reports.
end note
@enduml
```

## 8.2 STM-02 — Emergency lifecycle

```plantuml
@startuml
hide empty description
[*] --> Queued : emergency accepted
Queued --> Acknowledged : operator acknowledges
Queued --> Failed : processing/stream failure recorded
Queued --> Cancelled : user/operator cancels
Acknowledged --> Dispatched : responder dispatched
Acknowledged --> Completed : resolved without dispatch
Acknowledged --> Failed : response cannot continue
Acknowledged --> Cancelled : alert cancelled
Dispatched --> Completed : intervention completed
Dispatched --> Failed : dispatch failed
Dispatched --> Cancelled : authorized cancellation
Completed --> [*]
Failed --> [*]
Cancelled --> [*]

state Queued {
  [*] --> AlertStored
  AlertStored --> RecordingActive : socket authorized
  RecordingActive --> RecordingStored : complete received
  RecordingActive --> RecordingDiscarded : disconnect / size limit / abort
}

note right of Queued
  Alert creation and video transfer are related,
  but the alert remains valid without a recording.
end note
@enduml
```

---

## 9. Class diagram

The class diagram focuses on persistent domain models and their principal relationships. Embedded value objects are shown separately where they clarify cardinality.

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam shadowing false
hide methods

class User {
  +ObjectId id
  +String email
  +String phone
  -String passwordHash
  +String fullName
  +Role role
  +Locale locale
  +Boolean verified
  +Boolean active
  +Jurisdiction jurisdiction
  +TrustedContact[] trustedContacts
  +Date createdAt
  +Date updatedAt
}

enum Role {
  citizen
  dispatcher
  police
  gendarmerie
  fire
  medical
  ngo
  council
  admin
}

class Report {
  +ObjectId id
  +String reference
  +String category
  +Severity severity
  +String description
  +String addressText
  +Boolean isAnonymous
  +Boolean sensitive
  -String recoveryHash
  +ReportStatus status
  +Boolean publicVisibility
  +ModerationStatus moderationStatus
  +String clientSubmissionId
  +Boolean legalHold
  +Date retentionUntil
}

class Attachment {
  +String originalName
  +String storedName
  +String mimeType
  +Number size
  +String sha256
  +AttachmentKind kind
}

class TimelineEvent {
  +String status
  +String note
  +Date at
}

class Emergency {
  +ObjectId id
  +String reference
  -String recoveryHash
  +EmergencyType type
  +EmergencyStatus status
  +String recordingSessionId
  +Boolean trustedContactsNotified
  +Boolean authorityNotified
  +Boolean legalHold
  +Date retentionUntil
}

class Recording {
  +String storedName
  +String mimeType
  +Number size
  +Date startedAt
  +Date completedAt
}

class EmergencyEvent {
  +String type
  +String note
  +Date at
}

class Acknowledgement {
  +Date at
  +String note
}

class Agency {
  +ObjectId id
  +String name
  +AgencyType type
  +Boolean verified
  +String[] phones
  +Jurisdiction jurisdiction
}

class Notification {
  +ObjectId id
  +LocalizedText title
  +LocalizedText message
  +NotificationType type
  +Jurisdiction jurisdiction
  +String actionUrl
  +Date expiresAt
}

class Payment {
  +ObjectId id
  +String reference
  +PaymentProvider provider
  +String phone
  +Number amount
  +String currency = XAF
  +PaymentPurpose purpose
  +PaymentStatus status
  +String gateway = digipay
  +String externalReference
  +Number chargedAmount
  +Number commissionAmount
  +Boolean simulated
}

class CommunityPost {
  +ObjectId id
  +String title
  +String content
  +String category
  +VerificationStatus verificationStatus
  +ModerationStatus moderationStatus
  +Number reportsCount
}

class Comment {
  +ObjectId id
  +String content
  +ModerationStatus moderationStatus
  +Date createdAt
}

class DataSubjectRequest {
  +ObjectId id
  +PrivacyRequestType type
  +String details
  +PrivacyRequestStatus status
  +String resolution
  +Date completedAt
}

class PushSubscription {
  +ObjectId id
  +String endpoint
  +Number expirationTime
  +String userAgent
}

class ChannelEvent {
  +ObjectId id
  +Channel channel
  +String externalId
  +String phone
  +String input
  +String response
  +ChannelStatus status
}

class AuditLog {
  +ObjectId id
  +String action
  +String resourceType
  +String resourceId
  +Mixed metadata
  +String ip
  +Date createdAt
}

class OtpCode {
  +ObjectId id
  +String phone
  -String codeHash
  +Number attempts
  +Date expiresAt
  +Date consumedAt
}

class Jurisdiction <<value object>> {
  +String region
  +String division
  +String subdivision
  +String council
  +String town
  +String quarter
  +String village
  +String landmark
}

class Location <<value object>> {
  +String type = Point
  +Number[2] coordinates
  +Number accuracy
}

User "1" -- "0..*" Report : reporter
User "1" -- "0..*" Emergency : activates
User "1" -- "0..*" Payment : makes
User "1" -- "0..*" CommunityPost : authors
User "1" -- "0..*" Comment : writes
User "1" -- "0..*" DataSubjectRequest : submits
User "1" -- "0..*" PushSubscription : owns
User "0..1" -- "0..*" AuditLog : actor
User "0..1" -- "0..*" Notification : sender
User "0..1" -- "0..*" Notification : target
User "0..*" -- "0..*" Notification : readBy
User "0..*" -- "0..*" Agency : members
User "0..1" -- "0..*" Report : assignedTo
User "0..1" -- "0..*" TimelineEvent : actor
User "0..1" -- "0..*" EmergencyEvent : actor
User "0..1" -- "0..*" Acknowledgement : responder
User "0..1" -- "0..*" DataSubjectRequest : handledBy

Agency "0..1" -- "0..*" Report : assignedAgency
Report "1" *-- "0..6" Attachment
Report "1" *-- "1..*" TimelineEvent
Report "0..1" -- "0..*" ChannelEvent : created from
Emergency "1" *-- "0..1" Recording
Emergency "1" *-- "1..*" EmergencyEvent
Emergency "1" *-- "0..1" Acknowledgement
CommunityPost "1" *-- "0..*" Comment

User ..> Role
User *-- Jurisdiction
Report *-- Jurisdiction
Report *-- Location
Emergency *-- Jurisdiction
Emergency *-- Location
Agency *-- Jurisdiction
Notification *-- Jurisdiction
OtpCode ..> User : creates/authorizes session
@enduml
```

### Key enumerations represented by the implementation

| Enumeration | Values |
|---|---|
| `ReportStatus` | `received`, `triaged`, `assigned`, `dispatched`, `action_taken`, `resolved`, `rejected` |
| `EmergencyStatus` | `queued`, `acknowledged`, `dispatched`, `completed`, `failed`, `cancelled` |
| `PaymentStatus` | `pending`, `success`, `failed`, `refunded`, `cancelled` |
| `PaymentProvider` | `mtn`, `orange` |
| `PaymentPurpose` | `donation`, `organization_subscription` |
| `EmergencyType` | `police`, `gendarmerie`, `fire`, `medical`, `gbv`, `general`, `panic_button` |
| `Severity` | `low`, `medium`, `high`, `critical` |
| `ModerationStatus` | `pending/verified/rejected` for reports; `visible/flagged/removed` for community content |
| `Channel` | `sms`, `ussd`, `whatsapp` |

---

## 10. Traceability to implementation

| UML element | Main implementation files |
|---|---|
| Authentication and users | `server/models/User.js`, `server/controllers/userController.js`, `server/routes/userRoutes.js` |
| Incident reports | `server/models/Report.js`, `server/controllers/reportController.js`, `server/routes/reportRoutes.js` |
| Emergency/video | `server/models/Emergency.js`, `server/controllers/emergencyController.js`, `server/routes/emergencyRoutes.js`, `src/components/emergency/EmergencyButton.tsx`, `src/components/dashboard/EmergencyLogsViewer.tsx` |
| DigiPay contribution | `server/models/Payment.js`, `server/controllers/paymentController.js`, `server/services/digiPayService.js`, `server/routes/paymentRoutes.js`, `src/pages/SupportPage.tsx` |
| Agencies | `server/models/Agency.js`, `server/controllers/agencyController.js`, `server/routes/agencyRoutes.js` |
| Notifications and push | `server/models/Notification.js`, `server/models/PushSubscription.js`, related controllers/routes/services |
| Community/moderation | `server/models/CommunityPost.js`, related controller and route |
| Privacy and audit | `server/models/DataSubjectRequest.js`, `server/models/AuditLog.js`, related controllers/routes |

## 11. Diagram inventory checklist

- [x] 1 general use-case diagram
- [x] 3 specific use-case diagrams with textual specifications
- [x] 3 sequence diagrams
- [x] 3 corresponding activity diagrams
- [x] 2 state-machine diagrams
- [x] 3 communication diagrams corresponding to the sequence diagrams
- [x] 1 domain class diagram
