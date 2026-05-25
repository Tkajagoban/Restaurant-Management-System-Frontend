# RMS Front End

## Overview

`RMS Front End` is the frontend application for a restaurant management system. It is built with React, TypeScript, and Vite, and provides role-based dashboards, order management, food content management, restaurant and table administration, notifications, and authentication.

## Key Features

- Role-based dashboard views for Admin, Steward, and Chef
- Protected routing for authenticated users
- Login and forgot password workflows
- Food content management, categories, subcategories, and variants
- Order creation, summary, and management
- Restaurant, table, tax, and user management modules
- User and role privileges support
- Real-time order notifications via WebSocket
- Responsive UI built with component-based architecture

## Technologies

- React 19
- TypeScript
- Vite
- React Router DOM
- Redux Toolkit
- Axios
- ESLint
- Lucide React and React Icons

## Project Structure

- `src/`
  - `api/` — API clients and services for the backend
  - `assets/` — static assets such as images
  - `components/` — UI components organized by atoms, molecules, organisms, and pages
  - `contexts/` — React context providers for auth and notifications
  - `hooks/` — custom hooks such as WebSocket order handling
  - `redux/` — Redux store and typed hooks
  - `styles/` — global CSS and variables
  - `utils/` — utility helpers

## Routing

Routes are defined in `src/App.tsx`:

- `/login` — login page
- `/forgot-password` — password recovery page
- `/dashboard` — main protected application interface

## Setup and Run

### Prerequisites

- Node.js 18+ or compatible environment
- npm

### Install dependencies

```bash
npm install
```

### Run development server

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## Notes

- The dashboard is protected by `src/api/ProtectedRoute.tsx` and requires authentication.
- The app uses `AuthContext` for login state and `OrderNotificationContext` for live order updates.
- Custom styling is managed via CSS modules and global CSS variables.

## Contact

For more information, refer to the source files in `src/components/pages` and `src/api` for business logic and page structure.
