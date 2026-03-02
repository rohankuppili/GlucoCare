# GlucoCare

## Local development

### Prerequisites

- Node.js (LTS recommended)
- npm

### Install

```sh
npm install
```

### Firebase setup

1. Create a Firebase project and Web app in the Firebase Console.
2. Enable Google Sign-In:
   - Build -> Authentication -> Sign-in method -> Google -> Enable
3. Create a Firestore database:
   - Build -> Firestore Database -> Create database
4. Create a local env file:
   - Copy `.env.example` to `.env.local`
   - Fill in the `VITE_FIREBASE_*` values from your Firebase Web App config

### Run

```sh
npm run dev
```

The app will be available at:

- http://localhost:8080/

## Tech stack

- Vite
- TypeScript
- React
- shadcn/ui
- Tailwind CSS
