# Next.js Chat App with Supabase

A modern chat application built with Next.js 14 and Supabase, supporting both one-to-one and group chats with real-time messaging.

## Features

- 🔐 User authentication (Sign up / Sign in)
- 💬 One-to-one direct messaging
- 👥 Group chat functionality
- 💬 Reply to messages (WhatsApp-style)
- 😊 Emoji picker for sending emojis
- 🎬 GIF support with Tenor API integration
- 🎨 Sticker picker
- 📎 File and image uploads
- 🗑️ Message deletion
- 🔔 Real-time notifications (browser + in-app)
- ⚡ Real-time message updates
- 🎨 Modern, WhatsApp-like UI with Tailwind CSS
- 📅 Date separators in chat
- 👤 User profile panel with photos/files tabs
- 🔒 Row Level Security (RLS) for data protection

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor in your Supabase dashboard
3. Run the SQL script from `supabase/schema.sql` to create all necessary tables and policies
4. If you already have the messages table, run `supabase/add_reply_migration.sql` to add the reply functionality
5. Run `supabase/add_features_migration.sql` to add file attachments, message types, deletion, and notifications
6. Run `supabase/storage_setup.sql` to set up file storage bucket
7. Run `supabase/status_schema.sql` to create status/stories tables
8. Run `supabase/status_storage_setup.sql` to set up status and avatar storage buckets
9. In Supabase Dashboard, go to Storage and verify buckets are created (chat-files, status-media, avatars)

### 3. Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_TENOR_API_KEY=your_tenor_api_key
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
   ```

   You can find these values in your Supabase project settings under "API".
   
   For Tenor API key:
   - Get a free API key from [developers.google.com/tenor](https://developers.google.com/tenor/guides/quickstart)
   - Create a project in Google Cloud Console and enable Tenor API
   - Copy your API key
   - Add it to `.env.local` (optional - GIFs won't work without it)

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The application uses the following tables:

- **profiles**: User profile information
- **chats**: Chat rooms (both direct and group)
- **chat_participants**: Junction table linking users to chats
- **messages**: Individual messages in chats

## Usage

1. **Sign Up**: Create a new account with your email and password
2. **Create Chat**: Click "New Chat" to start a conversation
   - Select "Direct Chat" for one-to-one messaging
   - Select "Group Chat" for group conversations (requires a group name)
3. **Send Messages**: Type and send messages in real-time
4. **Reply to Messages**: Click on any message to reply to it (WhatsApp-style)
5. **Send Emojis**: Click the emoji icon in the message input to open the emoji picker
6. **Send GIFs**: Click the GIF icon to search and send GIFs (requires Tenor API key)
7. **Send Stickers**: Click the sticker icon to send emoji stickers
8. **Upload Files**: Click the attachment icon to upload files and images
9. **Delete Messages**: Hover over your own messages and click the delete icon
10. **View Notifications**: Click the bell icon to see notifications
11. **View Profile**: Click on the profile icon in sidebar or navigate to `/profile` to edit your profile
12. **View Status**: Click the status icon in sidebar or navigate to `/status` to view and create status updates (stories)
13. **Add Participants**: In group chats, click the "+" icon to invite more users

## Technologies Used

- **Next.js 14**: React framework with App Router
- **Supabase**: Backend as a service (database, auth, real-time)
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **date-fns**: Date formatting utilities
- **emoji-picker-react**: Emoji picker component
- **axios**: HTTP client for Tenor API

## Project Structure

```
myapp/
├── app/
│   ├── chat/
│   │   └── page.tsx          # Main chat interface
│   ├── profile/
│   │   └── page.tsx          # User profile page
│   ├── notifications/
│   │   └── page.tsx          # Notifications page
│   ├── status/
│   │   └── page.tsx          # Status/stories page
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Home/auth page
│   └── globals.css            # Global styles
├── components/
│   ├── Login.tsx              # Authentication component
│   ├── ChatList.tsx           # List of all chats
│   ├── ChatWindow.tsx         # Chat message interface with all features
│   ├── CreateChatModal.tsx    # Modal to create new chats
│   ├── AddParticipantsModal.tsx # Modal to add users to groups
│   ├── EmojiPicker.tsx        # Emoji picker component
│   ├── GifPicker.tsx          # GIF picker component
│   ├── StickerPicker.tsx      # Sticker picker component
│   ├── ReplyPreview.tsx       # Reply preview component
│   ├── UserProfilePanel.tsx   # User profile/details panel
│   └── NotificationBell.tsx   # Notification bell component
├── lib/
│   ├── supabase.ts            # Supabase client
│   ├── types.ts               # TypeScript type definitions
│   ├── storage.ts             # File upload utilities
│   └── notifications.ts       # Notification utilities
└── supabase/
    ├── schema.sql             # Database schema
    ├── add_reply_migration.sql # Migration to add reply functionality
    ├── add_features_migration.sql # Migration for files, GIFs, stickers, deletion
    ├── storage_setup.sql      # Storage bucket setup for chat files
    ├── status_schema.sql      # Status/stories database schema
    ├── status_storage_setup.sql # Storage setup for status and avatars
    └── fix_recursion.sql      # Fix for RLS recursion issue
```

## Security

The application uses Supabase Row Level Security (RLS) policies to ensure:
- Users can only see chats they participate in
- Users can only send messages to chats they're part of
- Profile data is protected appropriately

## License

MIT
