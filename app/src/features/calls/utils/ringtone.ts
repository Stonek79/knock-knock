/**
 * Утилита для воспроизведения рингтона входящего вызова через нативный Web Audio API.
 * Работает во всех современных браузерах без зависимости от внешних аудиофайлов.
 */

const AUDIO_CONTEXT_STATE = {
    RUNNING: "running",
    SUSPENDED: "suspended",
    CLOSED: "closed",
} as const;

let audioCtx: AudioContext | null = null;
let ringtoneInterval: number | null = null;

/**
 * Запускает зацикленный звук входящего телефонного звонка (двухтональный гудок 440Гц + 480Гц).
 */
export function startRingtone(): void {
    if (ringtoneInterval !== null) {
        return;
    }

    const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
    if (!AudioContextClass) {
        return;
    }

    try {
        if (!audioCtx) {
            audioCtx = new AudioContextClass();
        }

        if (audioCtx.state === AUDIO_CONTEXT_STATE.SUSPENDED) {
            audioCtx.resume();
        }

        const playToneBurst = () => {
            if (!audioCtx || audioCtx.state !== AUDIO_CONTEXT_STATE.RUNNING) {
                return;
            }

            const now = audioCtx.currentTime;

            // Гармоничный классический телефонный сигнал (440Hz + 480Hz)
            const osc1 = audioCtx.createOscillator();
            const osc2 = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            osc1.type = "sine";
            osc2.type = "sine";
            osc1.frequency.setValueAtTime(440, now);
            osc2.frequency.setValueAtTime(480, now);

            // Плавное нарастание и затухание для отсутствия щелчков
            gainNode.gain.setValueAtTime(0.001, now);
            gainNode.gain.exponentialRampToValueAtTime(0.15, now + 0.05);
            gainNode.gain.setValueAtTime(0.15, now + 1.2);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

            osc1.connect(gainNode);
            osc2.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 1.4);
            osc2.stop(now + 1.4);
        };

        // Играем первый гудок сразу
        playToneBurst();

        // Повторяем гудок каждые 3 секунды
        ringtoneInterval = window.setInterval(playToneBurst, 3000);
    } catch {
        // Игнорируем блокировки автовоспроизведения браузером до первого клика
    }
}

/**
 * Мгновенно останавливает воспроизведение рингтона.
 */
export function stopRingtone(): void {
    if (ringtoneInterval !== null) {
        clearInterval(ringtoneInterval);
        ringtoneInterval = null;
    }

    if (audioCtx && audioCtx.state !== AUDIO_CONTEXT_STATE.CLOSED) {
        try {
            audioCtx.suspend();
        } catch {
            // Игнорируем возможные ошибки при закрытии контекста
        }
    }
}
