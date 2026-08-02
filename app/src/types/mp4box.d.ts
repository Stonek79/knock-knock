declare module "mp4box" {
    export interface MP4Track {
        id: number;
        created: Date;
        modified: Date;
        volume: number;
        track_width: number;
        track_height: number;
        timescale: number;
        duration: number;
        bitrate: number;
        codec: string;
        language: string;
        nb_samples: number;
        type: "video" | "audio" | "hint" | "metadata" | "text";
        audio?: {
            channel_count: number;
            sample_rate: number;
        };
    }

    export interface MP4Info {
        duration: number;
        timescale: number;
        isFragmented: boolean;
        isPlayable: boolean;
        hasIOD: boolean;
        brands: string[];
        created: Date;
        modified: Date;
        tracks: MP4Track[];
    }

    export interface MP4Sample {
        track_id: number;
        description: unknown;
        units: unknown;
        number: number;
        dts: number;
        cts: number;
        duration: number;
        timescale: number;
        is_sync: boolean;
        is_leading: number;
        depends_on: number;
        is_depended_on: number;
        has_redundancy: number;
        degradation_priority: number;
        offset: number;
        size: number;
        data: Uint8Array;
    }

    export interface MP4BoxEntry {
        avcC?: {
            write(stream: DataStream): void;
        };
        hvcC?: {
            write(stream: DataStream): void;
        };
        vpcC?: {
            write(stream: DataStream): void;
        };
    }

    export interface MP4TrackMoov {
        mdia?: {
            minf?: {
                stbl?: {
                    stsd?: {
                        entries: MP4BoxEntry[];
                    };
                };
            };
        };
    }

    export interface MP4File {
        onReady?: (info: MP4Info) => void;
        onSamples?: (id: number, user: unknown, samples: MP4Sample[]) => void;
        onError?: (e: string) => void;
        appendBuffer(buffer: ArrayBuffer & { fileStart?: number }): number;
        flush(): void;
        setExtractionOptions(
            id: number,
            user?: unknown,
            options?: { nbSamples?: number; q?: number },
        ): void;
        start(): void;
        stop(): void;
        getTrackById(id: number): MP4TrackMoov | undefined;
    }

    export class DataStream {
        static BIG_ENDIAN: boolean;
        static LITTLE_ENDIAN: boolean;
        buffer: ArrayBuffer;
        constructor(
            buffer?: ArrayBuffer,
            byteOffset?: number,
            endianness?: boolean,
        );
    }

    export function createFile(): MP4File;
}
