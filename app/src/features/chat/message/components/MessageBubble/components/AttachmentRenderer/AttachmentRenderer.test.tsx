import { cleanup, render } from "@testing-library/react";
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    type Mock,
    vi,
} from "vitest";
import { ATTACHMENT_TYPES } from "@/lib/constants";
import { useMedia } from "@/lib/mediadb/useMedia";
import { mediaService } from "@/lib/services/media";
import type { Attachment } from "@/lib/types";
import styles from "./attachment-renderer.module.css";
import { AttachmentRenderer } from "./index";

// Хук и сервис медиа замоканы: тест проверяет продуктовый контракт галереи
// (data-count) и отображение image/placeholder, без IndexedDB и без Dev/Prod API.
vi.mock("@/lib/mediadb/useMedia", () => ({
    useMedia: vi.fn(),
}));

vi.mock("@/lib/services/media", () => ({
    mediaService: {
        getSystemFileUrl: vi.fn(() => "/system/file.jpg"),
    },
}));

const mockedUseMedia = useMedia as Mock;
const mockedGetSystemFileUrl = mediaService.getSystemFileUrl as Mock;

const readyMedia = {
    objectUrl: "blob:mock-original",
    thumbnailUrl: undefined,
    isLoading: false,
    error: null,
    metadata: undefined,
};

const failedMedia = {
    objectUrl: undefined,
    thumbnailUrl: undefined,
    isLoading: false,
    error: new Error("media failed to load"),
    metadata: undefined,
};

function imageAttachments(count: number): Attachment[] {
    return Array.from({ length: count }, (_, i) => ({
        id: `att-img-${i}`,
        file_name: `img-${i}.jpg`,
        file_size: 100,
        content_type: "image/jpeg",
        url: "https://cdn.example/thumb.jpg",
        type: ATTACHMENT_TYPES.IMAGE,
    }));
}

function renderGallery(count: number) {
    return render(
        <AttachmentRenderer
            attachments={imageAttachments(count)}
            setLightboxIndex={() => {}}
            isOwn={false}
            userId="user-1"
            onMediaError={() => {}}
        />,
    );
}

beforeEach(() => {
    mockedUseMedia.mockReset();
    mockedGetSystemFileUrl.mockClear();
});

afterEach(() => {
    cleanup();
});

describe("AttachmentRenderer: галерея (data-count)", () => {
    it.each([
        [2, "2"],
        [3, "3"],
        [4, "4"],
        [5, "many"],
    ] as const)("для %i медиа-вложений проставляется data-count=%s", (count, expected) => {
        mockedUseMedia.mockReturnValue(readyMedia);
        const { container } = renderGallery(count);

        const gallery = container.querySelector<HTMLElement>(
            `.${styles.mediaGallery}`,
        );
        expect(gallery).not.toBeNull();
        expect(gallery?.getAttribute("data-count")).toBe(expected);
    });

    it("для >4 медиа показывает не больше 4 плиток (many)", () => {
        mockedUseMedia.mockReturnValue(readyMedia);
        const { container } = renderGallery(7);

        const images = container.querySelectorAll(`.${styles.attachmentImage}`);
        expect(images.length).toBe(4);
    });
});

describe("AttachmentRenderer: плейсхолдер медиа", () => {
    it("рисует плейсхолдер для каждого медиа с ошибкой загрузки", () => {
        mockedUseMedia.mockReturnValue(failedMedia);
        const { container } = renderGallery(3);

        expect(
            container.querySelectorAll(`.${styles.imagePlaceholder}`).length,
        ).toBe(3);
        expect(
            container.querySelectorAll(`.${styles.attachmentImage}`).length,
        ).toBe(0);
    });

    it("при готовом URL рисует image, а не плейсхолдер", () => {
        mockedUseMedia.mockReturnValue(readyMedia);
        const { container } = renderGallery(1);

        expect(
            container.querySelectorAll(`.${styles.imagePlaceholder}`).length,
        ).toBe(0);
        expect(
            container.querySelectorAll(`.${styles.attachmentImage}`).length,
        ).toBe(1);
    });
});
