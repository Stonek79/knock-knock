# Knock-Knock: Secure PWA Messenger

A privacy-focused PWA messenger with End-to-End Encryption (E2EE), built with React 19, Supabase, and Web Crypto API.

## Core Features
1.  **E2E Encryption**: Messages are encrypted on the device (Web Crypto API + X25519/AES-GCM). Keys never leave the browser.
2.  **Privacy**: Zero-knowledge architecture. The server stores only encrypted blobs.
3.  **PWA**: Installable on iOS/Android/Desktop. Offline-first architecture.
4.  **Ghost Mode**: Ephemeral chats that disappear after closing.

## Technology Stack
-   **Frontend**: React 19, TypeScript, Vite.
-   **Routing**: TanStack Router.
-   **State**: Zustand + TanStack Query.
-   **Crypto**: Native Web Crypto API (SubtleCrypto).
-   **Backend**: Supabase (Auth, DB, Realtime).

## Development Rules

### 1. Mobile First
-   Development must follow the **Mobile First** principle.
-   Styles should target mobile screens by default.
-   Use `@media (min-width: 768px)` for tablet/desktop overrides.
-   Ensure touch targets are at least 44px.

### 2. File & Component Structure
-   **Component Folder Pattern**: Each component resides in its own folder with its styles.
    ```
    src/components/profile/
    ├── ProfileForm/
    │   ├── index.tsx
    │   └── ProfileForm.module.css
    ```
-   **Routes**: `src/routes` contains only layout/routing logic. Business logic should be in `src/components`.

### 3. Workflow & Git
-   **Git Push**: The User handles all commits and pushes manually. The AI agent does not run git commands.
-   **Communication**: Russian language is used for all collaboration.

### 4. Architecture
-   **Structure**: Based on a Unified Layout principle.
-   **Desktop**: Uses Resizable Panels (chat list vs chat window). Left sidebar combines chat list and bottom navigation.
-   **Mobile**: Single column view with bottom navigation.

### 5. Dev Mode (Mock Mode)
-   The project supports a fully functional **Mock Mode** without a backend connection.
-   **Features**:
    -   **Realtime Simulation**: Uses `EventEmitter` to simulate `postgres_changes`.
    -   **Full CRUD**: Supports creating and deleting chats and messages.
    -   **Persistence**: Data persists in `sessionStorage` (cleared on tab close if not saved to code, but "Reset DB" available).
-   If `.env` is missing, the app initializes in this mode automatically.

## Getting Started

### Prerequisites
-   Node.js 20+
-   npm

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
For full functionality, copy `.env.example` to `.env` and fill in Supabase credentials.
If no `.env` is provided, the app runs in **Mock Mode**.
