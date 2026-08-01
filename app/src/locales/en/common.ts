export const common = {
    email: "Email",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    close: "Close",
    signOut: "Sign Out",
    loading: "Loading...",
    error: "Error",
    delete: "Delete",
    deleting: "Deleting...",
    unknownError: "Unknown error (WTF)",
    success: "Success",
    password: "Password",
    required: "Required",
    back: "Back",
    search: "Search",
    today: "Today",
    yesterday: "Yesterday",
    comingSoon: "Coming soon",
    appDescription: "Secure PWA Messenger with End-to-End Encryption.",
    features: {
        e2e: {
            title: "🔒 E2E Encryption",
            desc: "Your messages are encrypted on your device. Only you and the recipient can read them.",
        },
        fast: {
            title: "💨 Fast & Lightweight",
            desc: "Built with modern web technologies for maximum performance.",
        },
        pwa: {
            title: "📱 PWA Ready",
            desc: "Install on any device. Works offline.",
        },
    },
    pwa: {
        installTitle: "Install Application",
        installDesc:
            "For notifications and video calls to work, add {{appName}} to your Home screen.",
        step1: "1. Tap the icon",
        step2: "2. Select",
        addToHome: "Add to Home Screen",
    },
    landing: {
        badge: "In Development",
        title: "The Future of Secure Communication",
        description:
            "The application is in closed beta. We will open access to everyone soon.",
        devLogin: "Developer Login",
    },
} as const;
