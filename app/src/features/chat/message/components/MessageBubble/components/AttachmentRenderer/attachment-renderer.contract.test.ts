import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * CSS-contract тесты для пропорций медиа-галереи и плейсхолдеров.
 *
 * Контракт: `--gallery-ratio` задаётся один раз на ячейку сетки для
 * `data-count="2/3/4/many"` и переиспользуется и для `.attachmentImage`, и для
 * `.imagePlaceholder`. Никаких отдельных литеральных `aspect-ratio` у плейсхолдера
 * для этих сеток быть не должно (дублирование убрано). Одиночное медиа
 * (`data-count="1"`) резервирует место через `aspect-ratio: 16 / 9`.
 */
const cssSource = readFileSync(
    resolve(
        process.cwd(),
        "src/features/chat/message/components/MessageBubble/components/AttachmentRenderer/attachment-renderer.module.css",
    ),
    "utf8",
);
describe("attachment-renderer.module.css: пропорции галереи", () => {
    it("задаёт --gallery-ratio один раз на ячейку для 2/4/many и квадратную схему", () => {
        expect(cssSource).toMatch(
            /\.mediaGallery\[data-count="2"\]\s*\{\s*--gallery-ratio:\s*1;\s*\}/,
        );
        expect(cssSource).toMatch(
            /\.mediaGallery\[data-count="4"\][\s\S]*?\[data-count="many"\]\s*\{\s*--gallery-ratio:\s*1;\s*\}/,
        );
    });

    it('задаёт --gallery-ratio раздельно первому и остальным элементам data-count="3"', () => {
        expect(cssSource).toMatch(
            /\.mediaGallery\[data-count="3"\]\s*>\s*\*:first-child\s*\{\s*--gallery-ratio:\s*2\s*\/\s*1;\s*\}/,
        );
        expect(cssSource).toMatch(
            /\.mediaGallery\[data-count="3"\]\s*>\s*\*:not\s*\(\s*:first-child\s*\)\s*\{\s*--gallery-ratio:\s*1;\s*\}/,
        );
    });

    it("изображение галереи использует единый var(--gallery-ratio)", () => {
        expect(cssSource).toMatch(
            /\.mediaGallery\[data-count="2"\][\s\S]*?\.attachmentImage[^{]*\{[\s\S]*?aspect-ratio:\s*var\(--gallery-ratio\);/,
        );
    });

    it("не содержит дублирующих литеральных aspect-ratio у плейсхолдера для 2/3/4/many", () => {
        // Новая единая схема использует `aspect-ratio: var(--gallery-ratio)`.
        // Любое литеральное `aspect-ratio: 1;` или `2 / 1;` у `.imagePlaceholder`
        // означает, что дублирующие старые правила вернулись.
        const literalPlaceholderRatio = cssSource.match(
            /\.imagePlaceholder\s*\{[^}]*?aspect-ratio:\s*(?:1|2\s*\/\s*1)\s*;/,
        );
        expect(literalPlaceholderRatio).toBeNull();
    });

    it("плейсхолдер одиночного медиа резервирует место через 16 / 9", () => {
        expect(cssSource).toMatch(
            /\.mediaGallery\[data-count="1"\]\s*\.imagePlaceholder\s*\{[\s\S]*?aspect-ratio:\s*16\s*\/\s*9;/,
        );
    });

    it("размещает базовые правила до специализированных data-count правил", () => {
        const baseImage = cssSource.indexOf(".imageButton {");
        const galleryImage = cssSource.indexOf(".mediaGallery .imageButton");
        const singleImage = cssSource.indexOf(
            '.mediaGallery[data-count="1"] .imageButton',
        );
        const basePlaceholder = cssSource.indexOf(".imagePlaceholder {");
        const galleryPlaceholder = cssSource.indexOf(
            ".mediaGallery .imagePlaceholder",
        );
        const singlePlaceholder = cssSource.indexOf(
            '.mediaGallery[data-count="1"] .imagePlaceholder',
        );

        expect(baseImage).toBeGreaterThanOrEqual(0);
        expect(baseImage).toBeLessThan(galleryImage);
        expect(galleryImage).toBeLessThan(singleImage);
        expect(basePlaceholder).toBeLessThan(galleryPlaceholder);
        expect(galleryPlaceholder).toBeLessThan(singlePlaceholder);
    });

    it("не содержит устаревших селекторов аудио и документов", () => {
        expect(cssSource).not.toMatch(/^\.(attachmentAudio|attachmentDoc)\b/m);
    });
});
