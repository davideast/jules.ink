# Jules Ink

Jules Ink is a command-line tool that analyzes Jules session data to provide real-time metrics and summaries of code changes. It streams session activities, processes Git patch data, and generates insightful summaries of file impacts, including insertions, deletions, and visual graphs of changes.

## About

This tool is designed to help developers and teams monitor and understand the development process in real-time. By connecting to a Jules session, Jules Ink provides a live feed of code changes, making it easy to track progress, identify trends, and stay on top of project activity.

## Features

- **Real-time Monitoring**: Streams Jules session data to provide live updates of code changes.
- **Change Analysis**: Parses Git patch data to calculate insertions, deletions, and total changes for each file.
- **Visual Graphs**: Generates visual representations of changes for a quick and intuitive understanding of file impacts.
- **Session Summaries**: Provides a summary of changes, including the total number of files changed, insertions, and deletions.

## Architecture

Jules Ink is built with Node.js and TypeScript, and it leverages the following key technologies:

- **`modjules`**: A library for interacting with the Jules API and streaming session data.
- **`parse-diff`**: A library for parsing Git patch data.
- **`tsx`**: A TypeScript execution environment for running the application.
- **`vitest`**: A testing framework for running unit and integration tests.

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/jules-ink.git
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```

## Usage

To start monitoring a Jules session, run the following command, replacing `[session-id]` with the ID of the session you want to analyze:

```bash
npm start -- [session-id]
```

Jules Ink will then connect to the session and start streaming activity data, displaying real-time summaries of code changes as they happen.
