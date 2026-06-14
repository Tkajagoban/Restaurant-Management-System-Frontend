# RMS Front End

## Overview

`RMS Front End` is the frontend application for a restaurant management system. It is built with React, TypeScript, and Vite. The app delivers role-based dashboards, order management workflows, food content management, restaurant and table administration, user privileges, and authentication.

## Key Features

- Role-based dashboard and navigation for Admin, Steward, and Chef
- Protected routing for authenticated users
- Login, forgot password, and OTP workflows
- Food content management: categories, subcategories, variants
- Restaurant, table, tax, and user management
- User and role privilege support with Redux state
- Real-time order notifications via WebSocket
- Modular UI built with atoms, molecules, and organisms

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
  - `api/` — centralized Axios instance, auth helpers, and backend services
  - `assets/` — images and static assets
  - `components/` — UI components organized by atoms, molecules, organisms, and pages
  - `contexts/` — React providers for authentication and notifications
  - `hooks/` — custom hooks for WebSocket and privilege helpers
  - `redux/` — store, slices, and typed hooks
  - `styles/` — global CSS, variables, and component styles
  - `utils/` — helper utilities such as validation functions

## Routing

Routes are defined in `src/App.tsx`:

- `/login` — login page
- `/forgot-password` — password recovery page
- `/dashboard` — protected dashboard interface

## Backend Integration

### API base URL

The backend API base URL is configured in `src/api/instance.ts`:

```ts
const BASE_URL = 'http://13.60.206.192:8089/api/v1/';
```

Update this constant if you need to point the app to a different backend environment.

### Authentication flow

- `AuthContext` stores authentication state and privilege payloads in `sessionStorage`
- `setAuthAfterLogin` persists `token`, user role, email, privileges, and IDs
- Axios request interceptor adds `Authorization: Bearer <token>` to requests when a session token exists
- `ProtectedRoute` checks for `accessToken` or `token` in `sessionStorage` before allowing access to protected routes
- Logout clears `sessionStorage` and resets auth state

### API request handling

- Requests are sent through the configured Axios instance in `src/api/instance.ts`
- `Content-Type` is automatically removed for `FormData` payloads so the browser can set the correct boundary
- Basic request/response logging is enabled for debugging

## Environment Configuration

This project currently uses a hard-coded API base URL in `src/api/instance.ts`. For a better environment setup, you can add a Vite environment variable such as `VITE_API_BASE_URL` and update the Axios instance accordingly.

Example:

```ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8089/api/v1/';
```

Then create a `.env` file with:

```env
VITE_API_BASE_URL=http://13.60.206.192:8089/api/v1/
```

## Local Setup

### Prerequisites

- Node.js 18+ or compatible runtime
- npm

### Install dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

Open the local development server URL shown by Vite, usually `http://localhost:5173/`.

### Production build

```bash
npm run build
```

The production output is generated under `dist/`.

### Preview built output

```bash
npm run preview
```

## Deployment

### AWS S3 static hosting

This repository includes a GitHub Actions workflow for deploying the production build to AWS S3 via `.github/workflows/frontend_deploy.yml`.

Required AWS secrets in GitHub:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `S3_BUCKET_NAME`

The workflow performs:

1. checkout repository
2. setup Node.js 20
3. install dependencies
4. build the app
5. configure AWS credentials
6. sync `dist/` to the S3 bucket

### S3 bucket setup notes

- Enable static website hosting for the bucket if you want direct website URLs
- Configure the bucket policy to allow public read access for static files
- Use CloudFront in front of the bucket for HTTPS and caching if needed

### Example S3 deployment command

The workflow uses:

```bash
aws s3 sync dist/ s3://${{ secrets.S3_BUCKET_NAME }} --delete
```

## GitHub Actions CI/CD

The current workflow is triggered on pushes to the `main` branch:

```yaml
on:
  push:
    branches: ["main"]
```

It runs the following steps:

- Checkout code
- Setup Node.js 20
- Install npm dependencies
- Build the frontend
- Configure AWS credentials using GitHub secrets
- Deploy built files to S3

## Troubleshooting

- If build fails, run `npm run build` locally and inspect TypeScript or Vite errors
- If protected routes redirect to login, verify that `sessionStorage` contains an auth token
- If API calls fail, confirm the base URL in `src/api/instance.ts` points to the correct backend
- If S3 deployment fails, verify GitHub secrets and AWS IAM permissions

## Useful commands

- `npm install` — install dependencies
- `npm run dev` — start local development server
- `npm run build` — build production output
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint across the project

## Notes

- Auth state is persisted via browser `sessionStorage`, not cookies
- The app uses React Router v7 and a Vite development build pipeline
- Most page-level logic lives under `src/components/pages`
- The backend API integration is centralized in `src/api/instance.ts`
