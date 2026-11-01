# CampusConnect — Report Guide

## Title page
- Institution: **[Institution name]**
- Department / course: **[Department and course]**
- Project title: **CampusConnect — Smart College Event & Notice Management System**
- Submitted by: **[Member 1 name, ID]**, **[Member 2 name, ID]**
- Submitted to: **[Faculty name]**
- Academic year / date: **[Details]**

## Abstract
CampusConnect is a locally hosted full-stack application for browsing college events, registering a demonstration student, managing registrations, reading campus notices, and administering the event calendar. It uses a React + TypeScript frontend, Go/Gin REST API, and SQLite persistence.

## Introduction
Describe the value of a centralized campus events and announcements portal and the audience served.

## Problem statement
Campus event information can be fragmented across channels. Students may miss events and administrators may lack a simple way to keep event details current.

## Objectives
- Centralize event discovery and campus notices.
- Provide useful search and category filters.
- Persist registrations and enforce capacity / duplicate rules.
- Demonstrate event CRUD through an admin panel.

## Technology stack
React, Vite, TypeScript, React Router, Lucide React, custom CSS, Fetch API, Go, Gin, SQLite (`modernc.org/sqlite`). Explain why local SQLite keeps the assignment easy to run.

## System architecture
Insert an architecture diagram or describe: Browser UI → REST endpoints (`localhost:8080/api`) → Gin handlers → SQLite. Vite serves the UI on port 5173. The browser uses the configured `VITE_API_URL`.

## Database design
Document `events`, `registrations`, and `notices`, primary / foreign keys, unique `(student_id,event_id)`, and cascade deletion. Include an ER diagram if required.

## Functionalities
Explain and add evidence for: (1) Event Listing, (2) Search and Category Filters, (3) Event Registration, (4) My Registrations and cancellation, (5) College Notice Board, (6) Admin Event Management (create, edit, delete).

## Testing results
Fill this table from actual execution; do not mark a check as passed until verified.

| Test | Expected result | Actual result |
|---|---|---|
| Health endpoint | JSON status `ok` | [Record result] |
| Event list and detail | Seeded records and valid 404 handling | [Record result] |
| Search + category | Combined filters narrow results | [Record result] |
| Registration / duplicate | First saved, duplicate rejected | [Record result] |
| Capacity and past date | Registration rejected | [Record result] |
| Registration cancellation | Row removed and capacity released | [Record result] |
| Notices | Sorted newest first | [Record result] |
| Admin CRUD | Create, update and delete persist | [Record result] |
| Persistence / CORS | Data survives reload; frontend calls API | [Record result] |

## Screenshots checklist
Capture real screenshots from the running app: Dashboard; Event listing; Search and category filters; Event details and successful registration; My Registrations; Notice Board; Admin Panel; Add Event form; Edit Event form. Do not fabricate screenshots.

## Division of work
Confirm actual ownership with both members before submitting. Suggested split gives each member three primary functionalities; pair-test integration together.

| Team member | Suggested features to demonstrate | Actual work (confirm and replace) |
|---|---|---|
| [Member 1] | Event Listing; Search and Category Filters; Event Registration | [Fill in actual contribution] |
| [Member 2] | My Registrations; College Notice Board; Admin Event Management | [Fill in actual contribution] |
| Both | Integration, testing, report, demo | [Fill in actual contribution] |

## Conclusion
Summarize what was built, what was learned, and realistic future improvements (authentication and admin authorization are outside this demo scope).

## Repository
GitHub repository: **[Insert repository URL]**
