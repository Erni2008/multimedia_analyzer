# Testing Strategy And Test Cases

## Testing Strategy

The testing approach combines:

- Unit testing for auth helpers and media processing helpers
- API testing for authentication, uploads, and watchlist endpoints
- Integration testing for database persistence and Celery task updates
- UI validation for primary flows in the dashboard
- Traceability from test cases back to use cases

## Test Environment

- Docker Compose environment
- PostgreSQL database
- Redis broker
- FastAPI service
- Celery worker
- Next.js frontend

## Core Test Cases

### TC-01 Register New User

- Use case: User registration
- Preconditions: Email does not exist
- Steps:
  1. Open the application
  2. Enter valid email and password
  3. Click Register
- Expected result:
  - Account is created
  - JWT token is stored
  - Session is active

### TC-02 Login Existing User

- Use case: User login
- Preconditions: User exists
- Steps:
  1. Enter valid credentials
  2. Click Sign In
- Expected result:
  - JWT token is returned
  - Dashboard loads user data

### TC-03 Upload Audio File

- Use case: Upload media file
- Preconditions: Authenticated session
- Steps:
  1. Select supported audio file
  2. Click Queue Processing
- Expected result:
  - File is stored
  - MediaAsset is created
  - Task is queued or processed directly

### TC-04 Upload Video File

- Use case: Upload media file
- Preconditions: Authenticated session
- Steps:
  1. Select supported video file
  2. Click Queue Processing
- Expected result:
  - Audio extraction path is invoked
  - Processing status progresses

### TC-05 Update Watchlist

- Use case: Update entity watchlist
- Preconditions: Authenticated session
- Steps:
  1. Enter comma-separated entities
  2. Click Save Watchlist
- Expected result:
  - Watchlist is saved in database
  - Updated values reload in UI

### TC-06 Alert Match Detected

- Use case: Review alert matches
- Preconditions: Watchlist contains an entity present in transcript
- Steps:
  1. Upload media
  2. Wait for processing
  3. Refresh dashboard
- Expected result:
  - `alert_matches` contains watched entity
  - Status is `alerted`

### TC-07 Unauthorized Upload Attempt

- Use case: Upload media file
- Preconditions: No active session
- Steps:
  1. Attempt upload
- Expected result:
  - UI blocks action or API returns unauthorized

### TC-08 Invalid Login

- Use case: User login
- Preconditions: Wrong password
- Steps:
  1. Enter invalid credentials
  2. Click Sign In
- Expected result:
  - Login rejected
  - User sees error message

## Acceptance Focus

The assignment demonstration should prove:

- Main use cases are implemented
- Data is persisted
- Results are visible
- Alerting logic works
- The prototype aligns with the specification
