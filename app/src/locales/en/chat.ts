export const chat = {
    title: 'Chats',
    noRooms: 'No active chats yet',
    noMessages: 'No messages',
    selectChat: 'Select a chat',
    selectChatDesc:
        'Select a user from the list on the left to start chatting.',
    sending: 'Sending...',
    typeMessage: 'Type a message...',
    newChat: 'New Chat',
    searchDescribe: 'Find user by name or username.',
    noUsersFound: 'No users found',
    noEncryption: 'Encryption inactive',
    back: 'Back to chats',
    privateSession: 'Private session (no history)',
    endSession: 'End and clear session',
    sessionEnded: 'Session ended, history cleared',
    privacyWarning:
        'This is a private chat. Messages will be deleted when both participants leave.',
    errors: {
        accessDenied: 'Access denied or room not found',
        keysMissing: 'Encryption keys missing. Update them in settings.',
    },
} as const;
