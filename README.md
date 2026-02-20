# Chat Application

A modern, full-featured chat application built with React, Vite, Tailwind CSS, and Supabase.

## Features

-   **Real-time Messaging**: Instant delivery of messages using Supabase Realtime.
-   **Authentication**: Secure email/password login and signup.
-   **Media Sharing**: Share images, files, and voice messages.
-   **Group Chats**: Create and manage group conversations.
-   **Message Management**: Edit, delete, reply, forward, and pin messages.
-   **Read Receipts**: See when your messages have been read.
-   **Typing Indicators**: See when others are typing.
-   **Search**: Search through message history and conversations.
-   **Theme Customization**: Personalize your chat experience with custom themes and backgrounds.
-   **Pagination**: Infinite scroll for seamless message history navigation.
-   **Offline Support**: Visual indicator when connection is lost.
-   **Robustness**: Graceful handling of deleted users and network errors.
-   **Profile Settings**: Manage your profile, avatar, and account status. Includes "Delete Account" functionality.

## Tech Stack

-   **Frontend**: React, TypeScript, Vite
-   **UI Library**: shadcn/ui
-   **Styling**: Tailwind CSS
-   **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
-   **Icons**: Lucide React

## Setup

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory
cd vite_react_shadcn_ts

# Step 3: Install the necessary dependencies
npm install

# Step 4: Configure Environment Variables
# Create a .env file in the root directory and add your Supabase credentials:
# VITE_SUPABASE_URL=your_supabase_project_url
# VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key

# Step 5: Start the development server
npm run dev
```

## Deployment

This project is ready to be deployed on [Vercel](https://vercel.com) or [Netlify](https://www.netlify.com). Ensure you set up the required environment variables for Supabase connection.

## License

MIT
