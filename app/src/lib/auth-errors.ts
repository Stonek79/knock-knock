import i18n from '@/lib/i18n';

/**
 * Maps authentication errors to user-friendly translation keys.
 * @param error - The error object or message.
 * @returns The translated error message.
 */
export function getAuthErrorMessage(error: unknown): string {
    let message = '';

    if (error instanceof Error) {
        message = error.message;
    } else if (
        typeof error === 'object' &&
        error !== null &&
        'message' in error
    ) {
        message = String((error as { message: unknown }).message);
    } else if (typeof error === 'string') {
        message = error;
    } else {
        message = 'Unknown error';
    }

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
