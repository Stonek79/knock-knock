import { useCallback, useEffect, useState } from 'react';

interface UseRateLimiterOptions {
    maxAttempts?: number;
    blockDurationSeconds?: number;
}

export function useRateLimiter({
    maxAttempts = 5,
    blockDurationSeconds = 60,
}: UseRateLimiterOptions = {}) {
    const [isBlocked, setIsBlocked] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [attempts, setAttempts] = useState(0);

    const recordAttempt = useCallback(() => {
        if (isBlocked) return;

        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= maxAttempts) {
            setIsBlocked(true);
            setSecondsLeft(blockDurationSeconds);
        }
    }, [attempts, isBlocked, maxAttempts, blockDurationSeconds]);

    const resetAttempts = useCallback(() => {
        setAttempts(0);
        setIsBlocked(false);
        setSecondsLeft(0);
    }, []);

    // Эффект таймера
    useEffect(() => {
        if (!isBlocked || secondsLeft <= 0) {
            if (isBlocked && secondsLeft <= 0) {
                setIsBlocked(false);
                setAttempts(0);
            }
            return;
        }

        const intervalId = setInterval(() => {
            setSecondsLeft((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(intervalId);
    }, [isBlocked, secondsLeft]);

    return {
        isBlocked,
        secondsLeft,
        attempts,
        recordAttempt,
        resetAttempts,
    };
}
