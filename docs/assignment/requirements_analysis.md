# Requirements Analysis

## Product Goal

MultimediaAnalyzer is a system for uploading audio and video files, extracting transcripts, generating summaries, detecting named entities, storing results in a database, and alerting users when selected entities are found.

## Primary Actors

- Analyst
- Authenticated user
- Background worker
- Administrator

## User Stories

1. As an authenticated user, I want to register and sign in so that I can securely manage my analysis workspace.
2. As an authenticated user, I want to upload an audio or video file so that the system can analyze its content.
3. As an authenticated user, I want the system to transcribe uploaded media so that spoken content becomes searchable.
4. As an authenticated user, I want the system to summarize the transcript so that I can quickly review the content.
5. As an authenticated user, I want named entities to be extracted so that I can identify relevant people, companies, and locations.
6. As an authenticated user, I want to define a watchlist of entities so that the system can highlight important matches.
7. As an authenticated user, I want the system to alert me when a watched entity is detected so that I can react quickly.
8. As an authenticated user, I want analysis results to be stored and listed so that I can review past uploads.
9. As an administrator, I want the application stack to run in containers so that deployment is repeatable.
10. As a developer, I want a clear functional prototype and test assets so that the assignment can be demonstrated and evaluated.

## Main Use Cases

1. User registration
2. User login
3. Upload media file
4. Queue media processing
5. Transcribe media
6. Summarize transcript
7. Extract named entities
8. Compare detected entities against watchlist
9. Save analysis results
10. View analysis dashboard
11. Update entity watchlist
12. Review alert matches

## Functional Requirements

- The system shall allow user registration and login with JWT-based authentication.
- The system shall allow authenticated users to upload supported media files.
- The system shall store media metadata and analysis outputs in PostgreSQL.
- The system shall process media asynchronously through Celery workers.
- The system shall support audio extraction from video through FFmpeg.
- The system shall generate a transcript for each uploaded file.
- The system shall generate a summary for each transcript.
- The system shall extract named entities from transcripts.
- The system shall compare detected entities against a user-defined watchlist.
- The system shall mark the record as alerted when watchlist matches exist.
- The system shall present results in a web dashboard.

## Non-Functional Requirements

- The application shall be containerized with Docker and Docker Compose.
- The UI shall be responsive on desktop and mobile.
- The application shall keep user data isolated by authenticated session.
- The system shall support scalable background processing through a separate worker.
- The project shall include test design artifacts traceable to use cases.
