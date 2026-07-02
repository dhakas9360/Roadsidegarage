# Garage Platform: Three-Role System & Services

This document describes the complete role-based architecture of the Garage platform, including responsibilities, available endpoints, and example workflows.

---

## 1️⃣ **ROLE_CUSTOMER** — Service Requester

### Responsibility
- Browse available garages nearby
- Create service requests/bookings
- Track booking status in real-time
- Cancel requests if needed

### Key Features
- Automatic employee assignment based on availability and load
- Capacity checking (can't book if garage is full)
- Location-based garage search

### Available Endpoints

#### Search & Browse
```http
GET /api/garages
Authorization: Bearer <token>
Description: List all garages
Response: 200 OK - List of garages with name, address, capacity, rating

GET /api/garages/nearby?lat=28.7041&lng=77.1025&radiusKm=50
Authorization: Bearer <token>
Description: Find garages within X km radius, sorted by distance
Response: 200 OK - Sorted list of garages with distance in km
```

#### Create & Track Bookings
```http
POST /api/bookings/place
Authorization: Bearer <token>
Content-Type: application/json
Body: {
  "garageId": 1,
  "appointmentDate": "2026-02-15",
  "vehicleId": 1,
  "userId": 1
}
Description: Create a new booking; system auto-assigns employee if available
Response: 201 Created - Booking object with status and assignedEmployee

GET /api/bookings (TODO: implement)
Authorization: Bearer <token>
Description: View all my bookings
Response: 200 OK - List of customer's bookings
```

### Example Customer Flow
1. **Register & Login**
   ```bash
   POST /auth/register
   {
     "username": "john_customer",
     "email": "john@example.com",
     "password": "pass123",
     "roles": ["ROLE_CUSTOMER"]
   }
   
   POST /auth/login
   {
     "username": "john_customer",
     "password": "pass123"
   }
   Response: { "token": "eyJhbGc...", "tokenType": "Bearer", "username": "john_customer", "roles": ["ROLE_CUSTOMER"] }
   ```

2. **Find Nearby Garage**
   ```bash
   GET /api/garages/nearby?lat=28.7041&lng=77.1025&radiusKm=50
   Authorization: Bearer eyJhbGc...
   
   Response (sorted by distance):
   [
     {
       "id": 1,
       "name": "ProFix Garage",
       "address": "123 Main St",
       "latitude": 28.7050,
       "longitude": 77.1035,
       "dailyCapacity": 10,
       "rating": 4.5,
       "distanceKm": 1.2
     }
   ]
   ```

3. **Place Booking**
   ```bash
   POST /api/bookings/place
   Authorization: Bearer eyJhbGc...
   {
     "garageId": 1,
     "appointmentDate": "2026-02-15",
     "vehicleId": 1,
     "userId": 1
   }
   
   Response:
   {
     "id": 10,
     "userId": 1,
     "garage": { "id": 1, "name": "ProFix Garage", ... },
     "vehicle": { "id": 1, "name": "Honda City", ... },
     "assignedEmployee": { "id": 5, "skills": "OIL_CHANGE", "activeJobs": 2, ... },
     "appointmentDate": "2026-02-15",
     "status": "ASSIGNED"  // Auto-assigned to least-loaded available employee
   }
   ```

---

## 2️⃣ **ROLE_EMPLOYEE** — Service Executor

### Responsibility
- Receive assigned jobs
- Accept/reject jobs
- Update job status (IN_PROGRESS, COMPLETED)
- View assigned bookings
- Navigate to customer locations

### Key Features
- Automatic job assignment to least-loaded employee
- Real-time job status tracking
- workload visibility (activeJobs counter)
- Location tracking (latitude/longitude stored)

### Available Endpoints

#### View Assigned Jobs
```http
GET /api/jobs/assigned?employeeId=5
Authorization: Bearer <token>
Description: Get all jobs assigned to this employee
Response: 200 OK - List of bookings assigned to employee
```

#### Accept Job (Change Status)
```http
PATCH /api/jobs/{id}/accept?employeeId=5
Authorization: Bearer <token>
Description: Employee accepts an assigned job, changes status from PENDING to IN_PROGRESS
Response: 200 OK - Updated booking with status=IN_PROGRESS
```

#### Update Job Status
```http
PATCH /api/jobs/{id}/status?status=COMPLETED
Authorization: Bearer <token>
Description: Update job status (COMPLETED, CANCELLED, etc.)
Response: 200 OK - Updated booking with new status
```

#### View Personal Profile (TODO)
```http
GET /api/employees/me
Authorization: Bearer <token>
Description: Get authenticated employee's details
Response: 200 OK - Employee object with garage, skills, location, activeJobs
```

### Example Employee Flow
1. **Register as Employee & Login**
   ```bash
   POST /auth/register
   {
     "username": "mechanic_mike",
     "email": "mike@garage.com",
     "password": "pass123",
     "roles": ["ROLE_EMPLOYEE"]
   }
   
   POST /auth/login
   {
     "username": "mechanic_mike",
     "password": "pass123"
   }
   Response: { "token": "eyJhbGc...", "roles": ["ROLE_EMPLOYEE"] }
   ```

2. **Garage Owner Creates Employee in Their Garage** (see ROLE_GARAGE_OWNER)

3. **Check Assigned Jobs**
   ```bash
   GET /api/jobs/assigned?employeeId=5
   Authorization: Bearer eyJhbGc...
   
   Response:
   [
     {
       "id": 10,
       "garage": { "id": 1, "name": "ProFix Garage" },
       "vehicle": { "id": 1, "name": "Honda City" },
       "appointmentDate": "2026-02-15",
       "status": "PENDING",
       "userId": 1  // Customer ID
     }
   ]
   ```

4. **Accept a Job**
   ```bash
   PATCH /api/jobs/10/accept?employeeId=5
   Authorization: Bearer eyJhbGc...
   
   Response:
   {
     "id": 10,
     "status": "IN_PROGRESS"  // Changed from PENDING
   }
   ```

5. **Mark Job as Complete**
   ```bash
   PATCH /api/jobs/10/status?status=COMPLETED
   Authorization: Bearer eyJhbGc...
   
   Response:
   {
     "id": 10,
     "status": "COMPLETED"
   }
   ```

---

## 3️⃣ **ROLE_GARAGE_OWNER** — Service Provider/Administrator

### Responsibility
- Register and manage garages
- Add/remove employees
- Set garage capacity & services
- Monitor all bookings in their garage
- Update booking status on behalf of employees (override)
- View employee workload
- Set garage location (latitude/longitude)

### Key Features
- Full control over garage settings
- Employee management and load balancing
- Booking oversight and manual status updates
- Nearby garage discovery (customers can find them)
- Capacity management

### Available Endpoints

#### Garage Management
```http
POST /api/garages
Authorization: Bearer <token>
Content-Type: application/json
Body: {
  "name": "ProFix Garage",
  "address": "123 Main Street, New Delhi",
  "latitude": 28.7041,
  "longitude": 77.1025,
  "dailyCapacity": 10,
  "rating": 4.5
}
Description: Create a new garage (ROLE_GARAGE_OWNER only)
Response: 201 Created - Garage object with ID

GET /api/garages
Authorization: Bearer <token>
Description: List all garages
Response: 200 OK - List of all garages

GET /api/garages/nearby?lat=28.7041&lng=77.1025&radiusKm=50
Authorization: Bearer <token>
Description: Find nearby garages for competitive analysis
Response: 200 OK - Sorted list
```

#### Employee Management
```http
POST /api/employees
Authorization: Bearer <token>
Content-Type: application/json
Body: {
  "garage": { "id": 1 },
  "latitude": 28.7050,
  "longitude": 77.1035,
  "available": true,
  "activeJobs": 0,
  "skills": "OIL_CHANGE,TIRE_CHANGE,BRAKE_REPAIR",
  "userId": 2
}
Description: Create/add an employee to the garage
Response: 201 Created - Employee object

GET /api/employees/garage/{garageId}
Authorization: Bearer <token>
Description: List all employees in a specific garage
Response: 200 OK - List of employees with workload details

GET /api/employees
Authorization: Bearer <token>
Description: List all employees (admin view)
Response: 200 OK - All employees
```

#### Booking Management
```http
GET /api/bookings/garage/{garageId} (TODO: implement)
Authorization: Bearer <token>
Description: View all bookings in a garage
Response: 200 OK - List of bookings for the garage

PATCH /api/jobs/{id}/status?status=COMPLETED
Authorization: Bearer <token>
Description: Owner can update booking status (override employee)
Response: 200 OK - Updated booking
```

### Example Garage Owner Flow
1. **Register as Garage Owner & Login**
   ```bash
   POST /auth/register
   {
     "username": "garage_owner_raj",
     "email": "raj@profix.com",
     "password": "secure123",
     "roles": ["ROLE_GARAGE_OWNER"]
   }
   
   POST /auth/login
   {
     "username": "garage_owner_raj",
     "password": "secure123"
   }
   Response: { "token": "eyJhbGc...", "roles": ["ROLE_GARAGE_OWNER"] }
   ```

2. **Create a Garage**
   ```bash
   POST /api/garages
   Authorization: Bearer eyJhbGc...
   {
     "name": "ProFix Garage",
     "address": "123 Main Street, New Delhi",
     "latitude": 28.7041,
     "longitude": 77.1025,
     "dailyCapacity": 10,
     "rating": 4.5
   }
   
   Response:
   {
     "id": 1,
     "name": "ProFix Garage",
     "address": "123 Main Street, New Delhi",
     "latitude": 28.7041,
     "longitude": 77.1025,
     "dailyCapacity": 10,
     "rating": 4.5
   }
   ```

3. **Add Employees to Garage**
   ```bash
   POST /api/employees
   Authorization: Bearer eyJhbGc...
   {
     "garage": { "id": 1 },
     "latitude": 28.7050,
     "longitude": 77.1035,
     "available": true,
     "activeJobs": 0,
     "skills": "OIL_CHANGE,TIRE_CHANGE",
     "userId": 2
   }
   
   Response:
   {
     "id": 5,
     "garage": { "id": 1, "name": "ProFix Garage" },
     "latitude": 28.7050,
     "longitude": 77.1035,
     "available": true,
     "activeJobs": 0,
     "skills": "OIL_CHANGE,TIRE_CHANGE",
     "userId": 2
   }
   ```

4. **View Employees in Garage**
   ```bash
   GET /api/employees/garage/1
   Authorization: Bearer eyJhbGc...
   
   Response:
   [
     {
       "id": 5,
       "garage": { "id": 1, "name": "ProFix Garage" },
       "available": true,
       "activeJobs": 2,
       "skills": "OIL_CHANGE,TIRE_CHANGE"
     },
     {
       "id": 6,
       "garage": { "id": 1, "name": "ProFix Garage" },
       "available": true,
       "activeJobs": 1,
       "skills": "BRAKE_REPAIR"
     }
   ]
   ```

5. **Monitor Bookings** (TODO: endpoint to be implemented)
   ```bash
   GET /api/bookings/garage/1
   Authorization: Bearer eyJhbGc...
   
   Response:
   [
     { "id": 10, "customer": "John", "status": "IN_PROGRESS", "assignedEmployee": { "id": 5 } },
     { "id": 11, "customer": "Jane", "status": "PENDING", "assignedEmployee": { "id": 6 } }
   ]
   ```

---

## 📊 Assignment Algorithm (V1)

When a **customer places a booking**, the system:

1. ✅ Checks if garage has capacity for that date
2. ✅ Finds all **available employees** in that garage
3. ✅ Selects employee with **least activeJobs** (least loaded)
4. ✅ Increments that employee's **activeJobs** counter
5. ✅ Sets booking status to **"ASSIGNED"**
6. ✅ Returns booking with assigned employee details

**Example:**
- Garage "ProFix" has 3 employees:
  - Employee A: activeJobs = 3
  - Employee B: activeJobs = 1 ⬅️ **Selected (least loaded)**
  - Employee C: activeJobs = 2
- Customer places booking → Employee B gets the job

---

## 🔐 Security & Authorization Summary

| Endpoint | Method | ROLE_CUSTOMER | ROLE_EMPLOYEE | ROLE_GARAGE_OWNER |
|----------|--------|:-------------:|:-------------:|:-----------------:|
| POST /auth/register | POST | ✅ | ✅ | ✅ |
| POST /auth/login | POST | ✅ | ✅ | ✅ |
| GET /api/garages | GET | ✅ | ✅ | ✅ |
| GET /api/garages/nearby | GET | ✅ | ✅ | ✅ |
| **POST /api/garages** | POST | ❌ | ❌ | ✅ |
| POST /api/bookings/place | POST | ✅ | ❌ | ❌ |
| GET /api/jobs/assigned | GET | ❌ | ✅ | ❌ |
| PATCH /api/jobs/{id}/accept | PATCH | ❌ | ✅ | ❌ |
| PATCH /api/jobs/{id}/status | PATCH | ❌ | ✅ | ✅ |
| POST /api/employees | POST | ❌ | ❌ | ✅ |
| GET /api/employees/garage/{id} | GET | ❌ | ✅ | ✅ |
| GET /api/employees | GET | ❌ | ❌ | ✅ |

---

## 🛠️ Implementation Details

### Models/Entities
- **User** → username, email, password, roles (many-to-many with Role)
- **Role** → name (ROLE_CUSTOMER, ROLE_EMPLOYEE, ROLE_GARAGE_OWNER)
- **Garage** → name, address, latitude, longitude, dailyCapacity, rating
- **Employee** → garage (FK), latitude, longitude, available, activeJobs, skills, userId
- **Booking** → userId, garage (FK), vehicle (FK), assignedEmployee (FK), appointmentDate, status
- **Category** → name, description, imageUrl, active (service types)

### Services
- **BookingService** → placeBooking(), integrates with AssignmentService
- **AssignmentService** → assignEmployee() (V1 algorithm: least-loaded in same garage)
- **CustomUserDetailsService** → loadUserByUsername(), supplies authorities to Spring Security

### Security Config
- **SecurityConfig** → @EnableMethodSecurity, JWT filter, BCrypt password encoding
- **JwtUtils** → generateJwtToken(), validateJwtToken(), getUsernameFromJwtToken()
- **JwtFilter** → Extracts Bearer token from Authorization header, validates, sets authentication

### Authorization
- @PreAuthorize("hasAuthority('ROLE_GARAGE_OWNER')") — Only garage owners
- @PreAuthorize("hasAuthority('ROLE_EMPLOYEE')") — Only employees
- @PreAuthorize("hasAuthority('ROLE_CUSTOMER')") — Only customers
- @PreAuthorize("isAuthenticated()") — Any logged-in user

---

## 📋 Current Status & TODO

### ✅ Implemented
- [x] Role model and seeding (ROLE_CUSTOMER, ROLE_EMPLOYEE, ROLE_GARAGE_OWNER)
- [x] Employee entity and repository
- [x] Assignment service (V1: least-loaded)
- [x] Booking service with automatic assignment
- [x] Job endpoints (assign, accept, status update)
- [x] Employee management (create, list by garage)
- [x] Garage management (create, list, nearby search via Haversine)
- [x] Method-level security (@PreAuthorize)
- [x] JWT authentication
- [x] Global exception handling

### 📌 TODO (Next phases)
- [ ] Implement GET /api/bookings/garage/{garageId} (owner views bookings)
- [ ] Implement GET /api/bookings (customer views own bookings)
- [ ] Add transactional boundaries around assignment + load increment
- [ ] Map authenticated user → employee automatically (avoid passing employeeId)
- [ ] Add DTOs with @NotBlank/@NotNull validation for creation endpoints
- [ ] Implement skill-based assignment (V2)
- [ ] Add distance-based assignment (V2)
- [ ] Add WebSocket/Server-Sent Events for real-time job notifications
- [ ] Add S3 image uploads for job photos
- [ ] Add job card/status history tracking
- [ ] Add rating/review system for employees and garages

---

## 🚀 How to Test

### Using cURL or Postman

1. **Register Customer**
   ```bash
   curl -X POST http://localhost:8080/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "username": "customer1",
       "email": "customer@example.com",
       "password": "pass123",
       "roles": ["ROLE_CUSTOMER"]
     }'
   ```

2. **Login & Get Token**
   ```bash
   curl -X POST http://localhost:8080/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "username": "customer1",
       "password": "pass123"
     }'
   ```

3. **Use Token in Requests**
   ```bash
   curl -X GET http://localhost:8080/api/garages \
     -H "Authorization: Bearer <TOKEN_FROM_STEP_2>"
   ```

---

## 💡 Example Complete Workflow

### Customer Books a Service

**Day 1: Setup**
1. Garage owner registers → POST /auth/register (ROLE_GARAGE_OWNER)
2. Owner creates garage → POST /api/garages
3. Owner adds 2 employees → POST /api/employees (x2)

**Day 2: Customer Booking**
1. Customer registers → POST /auth/register (ROLE_CUSTOMER)
2. Customer searches nearby → GET /api/garages/nearby?lat=...&lng=...
3. Customer books → POST /api/bookings/place
   - System auto-assigns to least-loaded employee
   - Booking status = "ASSIGNED"

**Day 3: Employee Execution**
1. Employee logs in → POST /auth/login (ROLE_EMPLOYEE)
2. Employee views jobs → GET /api/jobs/assigned?employeeId=...
3. Employee accepts job → PATCH /api/jobs/{id}/accept
   - Status changes to "IN_PROGRESS"
4. Employee completes → PATCH /api/jobs/{id}/status?status=COMPLETED
   - Status changes to "COMPLETED"

**Day 4: Owner Review**
1. Owner views bookings → GET /api/bookings/garage/{garageId} (TODO)
2. Owner can override status if needed → PATCH /api/jobs/{id}/status

---

Generated: February 2, 2026
Version: 1.0
