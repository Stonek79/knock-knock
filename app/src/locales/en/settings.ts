export const settings = {
    account: {
        account: "Account",
        identity: "Identity",
        security: "Security",
        dangerZone: "Danger Zone",
        changePassword: "Change Password",
        oldPassword: "Old Password",
        newPassword: "New Password",
        confirmPassword: "Confirm Password",
        passwordsNotMatch: "Passwords do not match",
        changeSuccess: "Password changed successfully",
        passwordError: "Error changing password",
        deleteAccount: "Delete Account",
        deleteWarning:
            "Deletion is irreversible and all user data and information about them will be destroyed and cannot be restored",
        enterPasswordToDelete: "Enter password to confirm",
    },
    appearance: {
        appearance: "Appearance",
        mode: "Mode",
    },
    privacy: {
        privacy: "Privacy",
        comingSoon: "Privacy settings will appear soon",
    },
    notifications: {
        notifications: "Notifications",
        comingSoon: "Notifications settings will appear soon",
        pushToggle: "Web Push notifications",
        unsupported: "Not supported by browser",
        pushDesc:
            "Receive notifications about new messages, even when the app is closed. Completely secure: we use E2E encryption.",
    },
    security: {
        security: "Security",
    },
    profile: {
        profile: "Profile",
        publicInfo: "Public Information",
    },
    storage: {
        storage: "Storage",
        deleteData: "Delete Data",
        description:
            "Images and videos are stored on your device for quick loading.",
        spaceUsed: "Space used",
        spaceAvailable: "Space available",
        deleteFiles: "Delete files",
        clearWarning:
            "Are you sure you want to delete all saved images and voice messages from this device? They will be downloaded again when you view the chats.",
        clearTitle: "Clear cache",
        clearCache: "Clear cache",
    },
} as const;
