# Garage Platform API Endpoints Quick Reference

## Authentication
```
POST /auth/register
POST /auth/login
```

## Garages (Location-based Discovery)
```
GET    /api/garages                                    # List all garages
GET    /api/garages/nearby?lat=X&lng=Y&radiusKm=50   # Nearby garages (sorted by distance)
POST   /api/garages                                   # Create garage (ROLE_GARAGE_OWNER only)
```

## Bookings (Customer & Owner)
```
POST   /api/bookings/place                           # Customer: Place a booking (auto-assign)
GET    /api/bookings/my?userId=X                     # Customer: View my bookings
GET    /api/bookings/garage/{garageId}               # Owner: View bookings in garage
```

## Jobs (Employee Tasks)
```
GET    /api/jobs/assigned?employeeId=X               # Employee: View assigned jobs
PATCH  /api/jobs/{id}/accept?employeeId=X            # Employee: Accept job (change status)
PATCH  /api/jobs/{id}/status?status=COMPLETED        # Employee/Owner: Update job status
```

## Employees (Garage Staffing)
```
POST   /api/employees                                 # Owner: Create employee
GET    /api/employees                                 # Owner: List all employees
GET    /api/employees/garage/{garageId}              # Owner/Employee: List garage employees
```

---

## By Role

### ROLE_CUSTOMER Access
✅ POST /auth/register
✅ POST /auth/login
✅ GET /api/garages
✅ GET /api/garages/nearby
✅ POST /api/bookings/place (auto-assign)
✅ GET /api/bookings/my

### ROLE_EMPLOYEE Access
✅ POST /auth/register
✅ POST /auth/login
✅ GET /api/garages
✅ GET /api/garages/nearby
✅ GET /api/jobs/assigned
✅ PATCH /api/jobs/{id}/accept
✅ PATCH /api/jobs/{id}/status
✅ GET /api/employees/garage/{garageId}

### ROLE_GARAGE_OWNER Access
✅ POST /auth/register
✅ POST /auth/login
✅ GET /api/garages
✅ GET /api/garages/nearby
✅ POST /api/garages
✅ POST /api/employees
✅ GET /api/employees
✅ GET /api/employees/garage/{garageId}
✅ GET /api/bookings/garage/{garageId}
✅ PATCH /api/jobs/{id}/status (override)

---

## Bearer Token Usage

All protected endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
```

Get token from login response and include in all subsequent requests.
