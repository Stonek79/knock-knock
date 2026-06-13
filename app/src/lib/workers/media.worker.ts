import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import type { MP4File, MP4Info, MP4Sample, MP4Track } from "mp4box";
import { createFile, DataStream } from "mp4box";
import {
    COMPRESSION_OPTIONS,
    MEDIA_ERROR_MESSAGES,
    MEDIA_SYSTEM_CONSTANTS,
    MEDIA_WORKER_ACTIONS,
} from "../constants";
import { mediaWorkerTaskSchema } from "../schemas/media";
import type { WorkerMediaPayload, WorkerProcessResult } from "../types";

/**
 * МЕДИА-ВОРКЕР (Media Vault v3)
 * Отвечает за тяжелые операции:
 * 1. Сжатие изображений перед шифрованием.
 * 2. Мультиплексирование и сжатие видео.
 * 3. Шифрование/Расшифровка Blob.
 */

self.onmessage = async (e: MessageEvent<unknown>) => {
    const result = mediaWorkerTaskSchema.safeParse(e.data);

    if (!result.success) {
        console.error(
            "[MediaWorker] Не удалось распарсить параметры задачи:",
            result.error,
        );
        self.postMessage({
            taskId:
                ((e.data as Record<string, unknown>)?.taskId as string) ||
                "unknown",
            success: false,
            error: MEDIA_ERROR_MESSAGES.WORKER_PROCESS_FAIL,
        } as WorkerProcessResult);
        return;
    }

    const { taskId, action, payload, cryptoKey } = result.data;

    try {
        let processResult: WorkerMediaPayload;

        switch (action) {
            case MEDIA_WORKER_ACTIONS.COMPRESS_IMAGE:
                processResult = await compressImage({
                    blob: payload as Blob,
                    key: cryptoKey,
                });
                break;
            case MEDIA_WORKER_ACTIONS.ENCRYPT_BLOB:
                processResult = await encryptBlob({
                    blob: payload as Blob,
                    key: cryptoKey,
                });
                break;
            case MEDIA_WORKER_ACTIONS.DECRYPT_BLOB:
                processResult = await decryptBlob({
                    blob: payload as Blob,
                    key: cryptoKey,
                });
                break;
            case MEDIA_WORKER_ACTIONS.MUX_VIDEO:
                processResult = await compressVideo({
                    blob: payload as Blob,
                    key: cryptoKey,
                });
                break;
            default:
                throw new Error(`Неподдерживаемое действие: ${action}`);
        }

        self.postMessage({
            taskId,
            success: true,
            data: processResult,
        } as WorkerProcessResult);
    } catch (error) {
        console.error(
            `[MediaWorker] Ошибка выполнения задачи ${action}, ID: ${taskId}:`,
            error,
        );
        self.postMessage({
            taskId,
            success: false,
            error: error instanceof Error ? error.message : String(error),
        } as WorkerProcessResult);
    }
};

/**
 * Сжатие изображения и генерация превью + шифрование.
 */
async function compressImage({
    blob,
    key,
}: {
    blob: Blob;
    key?: CryptoKey;
}): Promise<WorkerMediaPayload> {
    const bitmap = await createImageBitmap(blob);
    const { width, height } = bitmap;

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext(MEDIA_SYSTEM_CONSTANTS.CANVAS_CONTEXT_2D);
    if (!ctx) {
        throw new Error("Could not get canvas context");
    }
    ctx.drawImage(bitmap, 0, 0);

    const rawCompressed = await canvas.convertToBlob({
        type: COMPRESSION_OPTIONS.FORMAT_WEBP,
        quality: COMPRESSION_OPTIONS.QUALITY,
    });

    const compressedBlob = new Blob([await rawCompressed.arrayBuffer()], {
        type: rawCompressed.type,
    });

    const thumbScale = Math.min(
        COMPRESSION_OPTIONS.THUMB_WIDTH_OR_HEIGHT / width,
        1,
    );
    const thumbWidth = width * thumbScale;
    const thumbHeight = height * thumbScale;

    const thumbCanvas = new OffscreenCanvas(thumbWidth, thumbHeight);
    const thumbCtx = thumbCanvas.getContext(
        MEDIA_SYSTEM_CONSTANTS.CANVAS_CONTEXT_2D,
    );
    if (!thumbCtx) {
        throw new Error("Could not get thumb context");
    }
    thumbCtx.drawImage(bitmap, 0, 0, thumbWidth, thumbHeight);

    const rawThumb = await thumbCanvas.convertToBlob({
        type: COMPRESSION_OPTIONS.FORMAT_WEBP,
        quality: COMPRESSION_OPTIONS.THUMB_QUALITY,
    });

    const thumbBlob = new Blob([await rawThumb.arrayBuffer()], {
        type: rawThumb.type,
    });

    if (key) {
        const [encOriginal, encThumb] = await Promise.all([
            encryptData({ blob: compressedBlob, key }),
            encryptData({ blob: thumbBlob, key }),
        ]);
        return {
            original: encOriginal,
            thumbnail: encThumb,
            plainOriginal: compressedBlob,
            plainThumbnail: thumbBlob,
            metadata: { width, height },
        };
    }

    return {
        original: compressedBlob,
        thumbnail: thumbBlob,
        plainOriginal: compressedBlob,
        plainThumbnail: thumbBlob,
        metadata: { width, height },
    };
}

/**
 * Извлекает avcC/hvcC/vpcC описание кодека из метаданных MP4Box.
 */
function getCodecDescription(
    file: MP4File,
    trackId: number,
): Uint8Array | undefined {
    const track = file.getTrackById(trackId);
    if (!track) {
        return undefined;
    }

    const entries = track.mdia?.minf?.stbl?.stsd?.entries;
    if (!entries || entries.length === 0) {
        return undefined;
    }

    const entry = entries[0];
    const box = entry.avcC || entry.hvcC || entry.vpcC;
    if (!box) {
        return undefined;
    }

    const stream = new DataStream(undefined, 0, DataStream.BIG_ENDIAN);
    box.write(stream);
    return new Uint8Array(stream.buffer, 8); // Пропускаем первые 8 байт заголовка бокса
}

/**
 * Сжатие видео через WebCodecs и mp4-muxer.
 */
async function compressVideo({
    blob,
    key,
}: {
    blob: Blob;
    key?: CryptoKey;
}): Promise<WorkerMediaPayload> {
    if (
        typeof VideoEncoder === "undefined" ||
        typeof VideoDecoder === "undefined"
    ) {
        console.warn(
            "[MediaWorker] WebCodecs не поддерживается браузером. Fallback к шифрованию оригинала.",
        );
        return encryptBlob({ blob, key });
    }

    const arrayBuffer = await blob.arrayBuffer();

    return new Promise((resolve, reject) => {
        const file = createFile();
        let videoTrack: MP4Track | null = null;
        let audioTrack: MP4Track | null = null;
        let decoder: VideoDecoder | null = null;
        let encoder: VideoEncoder | null = null;
        let muxer: Muxer<ArrayBufferTarget> | null = null;

        let videoSamplesProcessed = 0;
        let totalVideoSamples = 0;
        let totalAudioSamples = 0;
        let audioSamplesProcessed = 0;
        let isFinalized = false;

        file.onError = (e: string) => {
            console.error("[MediaWorker] Ошибка в MP4Box:", e);
            reject(new Error(`MP4Box error: ${e}`));
        };

        file.onReady = async (info: MP4Info) => {
            try {
                videoTrack =
                    info.tracks.find((t) => {
                        return t.type === "video";
                    }) || null;
                audioTrack =
                    info.tracks.find((t) => {
                        return t.type === "audio";
                    }) || null;

                if (!videoTrack) {
                    throw new Error("В видеофайле не найден видео-трек");
                }

                totalVideoSamples = videoTrack.nb_samples;
                if (audioTrack) {
                    totalAudioSamples = audioTrack.nb_samples;
                }

                const originalWidth = videoTrack.track_width;
                const originalHeight = videoTrack.track_height;
                const targetWidth = Math.min(originalWidth, 1280);
                const targetHeight = Math.min(originalHeight, 720);
                const width = targetWidth & ~1;
                const height = targetHeight & ~1;

                const muxerOptions = {
                    target: new ArrayBufferTarget(),
                    video: {
                        codec: "avc" as const,
                        width: width,
                        height: height,
                    },
                    fastStart: "in-memory" as const,
                    audio: audioTrack
                        ? {
                              codec: "aac" as const,
                              numberOfChannels:
                                  audioTrack.audio?.channel_count || 2,
                              sampleRate:
                                  audioTrack.audio?.sample_rate || 44100,
                          }
                        : undefined,
                };

                muxer = new Muxer(muxerOptions);

                const canvas = new OffscreenCanvas(width, height);
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    throw new Error(
                        "Не удалось получить 2D-контекст OffscreenCanvas",
                    );
                }

                encoder = new VideoEncoder({
                    output: (chunk, metadata) => {
                        if (muxer) {
                            muxer.addVideoChunk(chunk, metadata);
                        }
                    },
                    error: (e) => {
                        console.error(
                            "[MediaWorker] Ошибка в VideoEncoder:",
                            e,
                        );
                        reject(new Error(`VideoEncoder error: ${e.message}`));
                    },
                });

                encoder.configure({
                    codec: "avc1.4d001f",
                    width: width,
                    height: height,
                    bitrate: 2_000_000,
                    framerate: 30,
                    latencyMode: "quality",
                });

                decoder = new VideoDecoder({
                    output: async (frame) => {
                        try {
                            ctx.clearRect(0, 0, width, height);
                            ctx.drawImage(frame, 0, 0, width, height);

                            const newFrame = new VideoFrame(canvas, {
                                timestamp: frame.timestamp,
                                duration: frame.duration || undefined,
                            });

                            if (encoder) {
                                console.log(
                                    `[MediaWorker] Отправляем кадр на кодирование: ${newFrame.timestamp}`,
                                );
                                encoder.encode(newFrame);
                            }
                            newFrame.close();
                            frame.close();

                            videoSamplesProcessed++;

                            if (videoSamplesProcessed === totalVideoSamples) {
                                if (decoder) {
                                    await decoder.flush();
                                }
                                if (encoder) {
                                    await encoder.flush();
                                }

                                if (
                                    !audioTrack ||
                                    audioSamplesProcessed === totalAudioSamples
                                ) {
                                    await finalizeEncoding();
                                }
                            }
                        } catch (err) {
                            console.error(
                                "[MediaWorker] Ошибка при обработке кадра видео:",
                                err,
                            );
                            reject(err);
                        }
                    },
                    error: (e) => {
                        console.error(
                            "[MediaWorker] Ошибка в VideoDecoder:",
                            e,
                        );
                        reject(new Error(`VideoDecoder error: ${e.message}`));
                    },
                });

                const description = getCodecDescription(file, videoTrack.id);

                decoder.configure({
                    codec: videoTrack.codec,
                    description,
                    codedWidth: originalWidth,
                    codedHeight: originalHeight,
                });

                file.setExtractionOptions(videoTrack.id, null, {
                    nbSamples: totalVideoSamples,
                });
                if (audioTrack) {
                    file.setExtractionOptions(audioTrack.id, null, {
                        nbSamples: totalAudioSamples,
                    });
                }

                file.start();
            } catch (err) {
                console.error(
                    "[MediaWorker] Ошибка при инициализации энкодера/декодера в onReady:",
                    err,
                );
                reject(err);
            }
        };

        file.onSamples = (
            trackId: number,
            _ref: unknown,
            samples: MP4Sample[],
        ) => {
            try {
                if (videoTrack && trackId === videoTrack.id) {
                    for (const sample of samples) {
                        const chunk = new EncodedVideoChunk({
                            type: sample.is_sync ? "key" : "delta",
                            timestamp:
                                (sample.cts * 1_000_000) / sample.timescale,
                            duration:
                                (sample.duration * 1_000_000) /
                                sample.timescale,
                            data: sample.data,
                        });
                        if (decoder) {
                            decoder.decode(chunk);
                        }
                    }
                } else if (audioTrack && trackId === audioTrack.id) {
                    for (const sample of samples) {
                        if (muxer) {
                            const chunk = new EncodedAudioChunk({
                                type: sample.is_sync ? "key" : "delta",
                                timestamp:
                                    (sample.cts * 1_000_000) / sample.timescale,
                                duration:
                                    (sample.duration * 1_000_000) /
                                    sample.timescale,
                                data: sample.data,
                            });
                            muxer.addAudioChunk(chunk);
                        }
                        audioSamplesProcessed++;
                    }

                    if (
                        videoSamplesProcessed === totalVideoSamples &&
                        audioSamplesProcessed === totalAudioSamples
                    ) {
                        finalizeEncoding();
                    }
                }
            } catch (err) {
                console.error("[MediaWorker] Ошибка в onSamples:", err);
                reject(err);
            }
        };

        const finalizeEncoding = async () => {
            if (isFinalized) {
                return;
            }
            isFinalized = true;

            try {
                if (muxer) {
                    muxer.finalize();
                    const { buffer } = muxer.target;
                    const compressedBlob = new Blob([buffer], {
                        type: "video/mp4",
                    });

                    if (key) {
                        const encrypted = await encryptData({
                            blob: compressedBlob,
                            key,
                        });
                        resolve({
                            original: encrypted,
                            plainOriginal: compressedBlob,
                        });
                    } else {
                        resolve({
                            original: compressedBlob,
                            plainOriginal: compressedBlob,
                        });
                    }
                } else {
                    throw new Error("Muxer не инициализирован");
                }
            } catch (err) {
                console.error(
                    "[MediaWorker] Ошибка при финализации видео:",
                    err,
                );
                reject(err);
            }
        };

        const fileStartBuffer = arrayBuffer as ArrayBuffer & {
            fileStart?: number;
        };
        fileStartBuffer.fileStart = 0;
        file.appendBuffer(fileStartBuffer);
        file.flush();
    });
}

/**
 * Шифрование произвольного Blob.
 */
async function encryptBlob({
    blob,
    key,
}: {
    blob: Blob;
    key?: CryptoKey;
}): Promise<WorkerMediaPayload> {
    if (!key) {
        return { original: blob, plainOriginal: blob };
    }
    const encrypted = await encryptData({ blob, key });
    return { original: encrypted, plainOriginal: blob };
}

/**
 * Расшифровка Blob.
 */
async function decryptBlob({
    blob,
    key,
}: {
    blob: Blob;
    key?: CryptoKey;
}): Promise<WorkerMediaPayload> {
    if (!key) {
        return { original: blob };
    }

    const res = await decryptData({ blob, key });
    return { original: res };
}

/**
 * AES-GCM шифрование.
 */
async function encryptData({
    blob,
    key,
}: {
    blob: Blob;
    key: CryptoKey;
}): Promise<Blob> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const buffer = await blob.arrayBuffer();
    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        buffer,
    );

    return new Blob([iv, encrypted], { type: blob.type });
}

/**
 * AES-GCM расшифровка.
 */
async function decryptData({
    blob,
    key,
}: {
    blob: Blob;
    key: CryptoKey;
}): Promise<Blob> {
    const buffer = await blob.arrayBuffer();
    const iv = buffer.slice(0, 12);
    const data = buffer.slice(12);

    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(iv) },
        key,
        data,
    );

    return new Blob([decrypted], { type: blob.type });
}
