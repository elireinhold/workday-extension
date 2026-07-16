# Workday Scheduler Extension

A Chrome extension that enhances the Stevens Institute of Technology Workday portal with a modern scheduling interface.

## Features

- **Course Search** — Search Workday courses directly from a sidebar without navigating the default UI
- **Conflict Detection** — Automatically detects time overlaps between sections you add to your schedule
- **Section Comparison** — View instructor, time, room, seats, and status side by side
- **Schedule Management** — Add and remove sections to build and compare possible schedules

## How It Works

The extension injects a sidebar into the Workday course search page. It intercepts Workday's native XHR requests to capture the session-specific search endpoint, then uses it to power a faster, cleaner search interface built on top of the existing Workday session.

## Stack

- TypeScript
- React
- Plasmo

## Usage

1. Install the extension in Chrome
2. Navigate to the Stevens Workday course search page
3. Do one search in the Workday UI to initialize the session
4. Click the **Scheduler** tab on the right edge of the page
