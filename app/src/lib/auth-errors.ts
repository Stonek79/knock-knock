import i18n from '@/lib/i18n';

/**
 * Maps authentication errors to user-friendly translation keys.
 * @param error - The error object or message.
 * @returns The translated error message.
 */
export function getAuthErrorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    const lowerMsg = message.toLowerCase();

    if (
        lowerMsg.includes('failed to fetch') ||
        lowerMsg.includes('networkerror')
    ) {
        return i18n.t('auth.errors.serverUnreachable');
    }

    if (
        lowerMsg.includes('invalid authentication credentials') ||
        lowerMsg.includes('invalid jwt')
    ) {
        return i18n.t('auth.errors.invalidCredentials');
    }

    if (
        lowerMsg.includes('magic link email') ||
        lowerMsg.includes('confirmation email')
    ) {
        return i18n.t('auth.errors.sendEmailFailed');
    }

    return i18n.t('auth.errors.unknown');
}
