# Garage Platform: System Architecture & Data Model

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT APPLICATIONS                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  │  Customer Mobile │  │ Employee Mobile  │  │  Owner Dashboard │
│  │      App         │  │      App         │  │   (Web)          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘
└─────────────────────────────────────────────────────────────────┘
                               │
                    REST API (HTTP/HTTPS)
                               │
┌─────────────────────────────────────────────────────────────────┐
│                    Spring Boot Backend                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Authentication & Authorization              │   │
│  │  (JwtUtils, JwtFilter, SecurityConfig, @PreAuthorize)   │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  REST Controllers                         │   │
│  │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │   │
│  │ │ AuthCtrl     │ │ GarageCtrl   │ │ BookingCtrl  │ ...  │   │
│  │ └──────────────┘ └──────────────┘ └──────────────┘      │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Business Logic (Services)                   │   │
│  │ ┌────────────────────┐ ┌─────────────────────────────┐  │   │
│  │ │ BookingService     │ │ AssignmentService (V1)      │  │   │
│  │ │ (auto-assign)      │ │ (least-loaded + available)  │  │   │
│  │ └────────────────────┘ └─────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │               Data Access (Repositories)                 │   │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │   │
│  │ │ UserRepo │ │GarageRepo│ │BookingRep│ │EmployeeR│    │   │
│  │ └──────────┘ └──────────┘ └──────────┘ └──────────┘    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────────┐
│                    Relational Database                          │
│                       (H2 / MySQL)                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Tables:                                                   │   │
│  │ • users, roles, user_roles (auth)                        │   │
│  │ • garages (providers)                                     │   │
│  │ • employees (staff)                                       │   │
│  │ • bookings (transactions)                                 │   │
│  │ • category/vehicles (service types)                       │   │
│  │ • garage_services (pricing)                               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Entity Relationship Diagram

```
┌─────────────────┐
│     USER        │
├─────────────────┤
│ id (PK)         │
│ username        │
│ email           │
│ password        │
│ roles* (M:N)    │
└────────┬────────┘
         │ 1:N
         ├─────────────────────┐
         │                     │
         ▼                     ▼
    ┌─────────────┐      ┌──────────────┐
    │ EMPLOYEE    │      │ BOOKING      │
    ├─────────────┤      ├──────────────┤
    │ id (PK)     │      │ id (PK)      │
    │ garage_id   │      │ user_id (FK) │
    │ user_id     │      │ garage_id    │
    │ latitude    │      │ vehicle_id   │
    │ longitude   │◄─────│ employee_id  │
    │ available   │ 1:N  │ appt_date    │
    │ activeJobs  │      │ status       │
    │ skills      │      └──────────────┘
    └─────────────┘              ▲
         ▲ 1:N                    │
         │                        │ M:1
         │                   ┌─────────────┐
         │                   │   GARAGE    │
         │                   ├─────────────┤
         │                   │ id (PK)     │
         │                   │ name        │
         │                   │ address     │
         │                   │ latitude    │
         │                   │ longitude   │
         │                   │ capacity    │
         │                   │ rating      │
         └───────────────────┴─────────────┘
                1:N
                │
                ▼
        ┌──────────────────┐
        │  CATEGORY        │
        ├──────────────────┤
        │ id (PK)          │
        │ name             │
        │ description      │
        │ imageUrl         │
        │ active           │
        └──────────────────┘
                ▲
                │ M:1
                │
        ┌──────────────────┐
        │ GARAGE_SERVICE   │
        ├──────────────────┤
        │ id (PK)          │
        │ garage_id (FK)   │
        │ category_id (FK) │
        │ price            │
        └──────────────────┘

Legend:
- PK = Primary Key
- FK = Foreign Key
- M:N = Many-to-Many
- M:1 = Many-to-One
- 1:N = One-to-Many
- * = ManyToMany join table
```

---

## 🔄 Data Flow: Customer Booking Process

```
1. CUSTOMER SEARCHES
   ┌─────────────────────────────────────┐
   │ GET /api/garages/nearby             │
   │ ?lat=28.70&lng=77.10&radiusKm=50    │
   └────────────────────┬────────────────┘
                        │
                        ▼
            ┌──────────────────────────┐
            │ GarageController         │
            │ - Calculate Haversine    │
            │ - Sort by distance       │
            │ - Return filtered list   │
            └────────────┬─────────────┘
                         │
                         ▼
              ┌───────────────────────┐
              │ Response: List of     │
              │ garages with distance │
              └───────────────────────┘

2. CUSTOMER PLACES BOOKING
   ┌──────────────────────────────────────┐
   │ POST /api/bookings/place             │
   │ {garageId: 1, vehicleId: 1, date...} │
   └────────────────────┬─────────────────┘
                        │
                        ▼
            ┌──────────────────────────────┐
            │ BookingController            │
            └────────────────┬─────────────┘
                             │
                             ▼
            ┌──────────────────────────────┐
            │ BookingService               │
            │ 1. Check capacity            │
            │ 2. Create booking (PENDING)  │
            │ 3. Call AssignmentService    │
            └────────────────┬─────────────┘
                             │
                             ▼
            ┌──────────────────────────────┐
            │ AssignmentService            │
            │ 1. Get available employees   │
            │    in same garage            │
            │ 2. Select least-loaded       │
            │ 3. Return employee          │
            └────────────────┬─────────────┘
                             │
                             ▼
            ┌──────────────────────────────┐
            │ BookingService (continued)   │
            │ 1. Assign employee to booking│
            │ 2. Set booking.status="ASGND"│
            │ 3. employee.activeJobs++     │
            │ 4. Save booking + employee   │
            └────────────────┬─────────────┘
                             │
                             ▼
              ┌───────────────────────────┐
              │ Response: Booking with    │
              │ assignedEmployee details  │
              └───────────────────────────┘

3. EMPLOYEE ACCEPTS JOB
   ┌────────────────────────────────┐
   │ PATCH /api/jobs/{id}/accept    │
   │ ?employeeId=5                  │
   └─────────────────┬──────────────┘
                     │
                     ▼
          ┌──────────────────────────┐
          │ JobController            │
          │ 1. Verify employee owns  │
          │    the booking           │
          │ 2. Set status=IN_PROGRESS│
          │ 3. Save booking          │
          └─────────────┬────────────┘
                        │
                        ▼
           ┌────────────────────────┐
           │ Response: Updated      │
           │ booking status         │
           └────────────────────────┘

4. EMPLOYEE COMPLETES JOB
   ┌────────────────────────────────────┐
   │ PATCH /api/jobs/{id}/status        │
   │ ?status=COMPLETED                  │
   └─────────────────┬──────────────────┘
                     │
                     ▼
          ┌──────────────────────────┐
          │ JobController            │
          │ 1. Set status=COMPLETED  │
          │ 2. Save booking          │
          │ 3. [TODO: Decrement      │
          │    employee.activeJobs]  │
          └─────────────┬────────────┘
                        │
                        ▼
           ┌────────────────────────┐
           │ Response: Updated      │
           │ booking (COMPLETED)    │
           └────────────────────────┘
```

---

## 🔐 Security Layers

```
1. AUTHENTICATION (JWT)
   Request comes in
      │
      ├─→ Header: "Authorization: Bearer eyJhbGc..."
      │
      ├─→ JwtFilter extracts token
      │
      ├─→ JwtUtils validates signature & expiry
      │
      ├─→ Username extracted from token
      │
      ├─→ CustomUserDetailsService loads User + Roles
      │
      ├─→ SecurityContextHolder set with Authentication
      │
      └─→ Request proceeds or 401 UNAUTHORIZED

2. AUTHORIZATION (@PreAuthorize)
   After authentication passes
      │
      ├─→ Check @PreAuthorize expression
      │
      ├─→ Verify user has required role/authority
      │
      ├─→ If allowed: execute endpoint method
      │
      └─→ If denied: 403 FORBIDDEN

3. EXCEPTION HANDLING (@ControllerAdvice)
   Any error during request
      │
      ├─→ Validation error → 400 BAD REQUEST (JSON)
      │
      ├─→ Auth error → 401 UNAUTHORIZED (JSON)
      │
      ├─→ GarageFullException → 409 CONFLICT (JSON)
      │
      ├─→ Generic Exception → 500 ERROR (JSON)
      │
      └─→ JSON response: { "error": "message" }
```

---

## 📊 Role-Based Access Control (RBAC) Matrix

| Feature | ROLE_CUSTOMER | ROLE_EMPLOYEE | ROLE_GARAGE_OWNER |
|---------|:-------------:|:-------------:|:-----------------:|
| **Authentication** | | | |
| Register | ✅ | ✅ | ✅ |
| Login | ✅ | ✅ | ✅ |
| **Browse** | | | |
| List all garages | ✅ | ✅ | ✅ |
| Search nearby | ✅ | ✅ | ✅ |
| **Booking** | | | |
| Place booking | ✅ | ❌ | ❌ |
| View my bookings | ✅ | ❌ | ❌ |
| View garage bookings | ❌ | ❌ | ✅ |
| **Jobs** | | | |
| View assigned jobs | ❌ | ✅ | ❌ |
| Accept job | ❌ | ✅ | ❌ |
| Update job status | ❌ | ✅ | ✅ |
| **Garage Mgmt** | | | |
| Create garage | ❌ | ❌ | ✅ |
| **Employee Mgmt** | | | |
| Create employee | ❌ | ❌ | ✅ |
| List employees | ❌ | ✅ (own garage) | ✅ |
| View all employees | ❌ | ❌ | ✅ |

---

## 🛠️ Technology Stack

**Backend Framework:** Spring Boot 3.x
**Security:** Spring Security + JWT (jjwt)
**ORM:** Spring Data JPA (Hibernate)
**Database:** H2 (dev) / MySQL (prod)
**Build:** Maven
**Validation:** Jakarta Validation (formerly javax.validation)
**Serialization:** Jackson (JSON)
**Utility:** Lombok

**Key Dependencies:**
- spring-boot-starter-web (REST)
- spring-boot-starter-security (Auth)
- spring-boot-starter-data-jpa (ORM)
- spring-boot-starter-validation (Validation)
- jjwt (JWT)
- h2database (H2)
- lombok (Code generation)

---

## 📈 Assignment Algorithm (V1: Least-Loaded)

```
INPUT: Booking with garageId
OUTPUT: Assigned Employee or NULL

ALGORITHM:
  1. Load garage by ID
     IF garage not found: RETURN NULL
  
  2. Query: employees WHERE garage_id = ? AND available = true
     IF no employees: RETURN NULL
  
  3. SORT employees by activeJobs ASC, id ASC
     (least active first, tie-break by id)
  
  4. SELECT first employee
  
  5. booking.assignedEmployee = selected_employee
  6. booking.status = "ASSIGNED"
  7. selected_employee.activeJobs++
  8. SAVE booking and employee
  
  9. RETURN booking

EXAMPLE:
  Garage "ProFix" has 3 available employees:
  - Employee A: activeJobs = 3
  - Employee B: activeJobs = 1 ◄─── SELECTED (least loaded)
  - Employee C: activeJobs = 2
  
  Result: Customer booking assigned to Employee B
```

---

## 🚀 Future Enhancements (V2+)

### Skill-Based Assignment
```
Match employee skills with booking service type
- Employee has skills: ["OIL_CHANGE", "TIRE_CHANGE"]
- Booking requires: "OIL_CHANGE"
- Result: Employee eligible ✓
```

### Distance-Based Assignment
```
Haversine distance from employee location to customer
- Prefer employees closer to customer
- Scoring: 60% distance + 30% load + 10% rating
```

### Real-Time Updates
```
WebSocket / Server-Sent Events
- Customer gets live status updates
- Employee gets push notifications for new jobs
- Owner sees live garage activity
```

### Image Uploads
```
S3 / Cloudinary integration
- Mechanics upload damage photos
- Share photos with customer
- Historical documentation
```

### Rating & Reviews
```
Customer rates employee/garage
Employee rates customer (behavior)
Owner sees analytics dashboard
```

### Job Card History
```
Full audit trail of status changes
Timestamps for SLA tracking
Invoice generation
```

---

Version: 1.0
Date: February 2, 2026
