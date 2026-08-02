import { Download, File, FileArchive, FileText, Loader2 } from "lucide-react";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { IconButton } from "@/components/ui/IconButton";
import { Text } from "@/components/ui/Text";
import { FILE_EXTENSIONS, ICON_SIZE } from "@/lib/constants";
import { useMedia } from "@/lib/mediadb/useMedia";
import type { Attachment } from "@/lib/types";
import { formatBytes } from "@/lib/utils/format";
import styles from "./documentattachmentcard.module.css";

export interface DocumentAttachmentCardProps {
    attachment: Attachment;
    userId: string;
    roomKey?: CryptoKey;
    isVault?: boolean;
}

function getFileIcon(name: string) {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    switch (ext) {
        case FILE_EXTENSIONS.PDF:
            return <FileText size={28} className={styles.pdfIcon} />;
        case FILE_EXTENSIONS.ZIP:
        case FILE_EXTENSIONS.RAR:
        case FILE_EXTENSIONS.SEVEN_ZIP:
        case FILE_EXTENSIONS.TAR:
            return <FileArchive size={28} className={styles.zipIcon} />;
        case FILE_EXTENSIONS.DOC:
        case FILE_EXTENSIONS.DOCX:
        case FILE_EXTENSIONS.TXT:
        case FILE_EXTENSIONS.RTF:
            return <FileText size={28} className={styles.docIcon} />;
        case FILE_EXTENSIONS.XLS:
        case FILE_EXTENSIONS.XLSX:
        case FILE_EXTENSIONS.CSV:
            return <File size={28} className={styles.xlsIcon} />;
        default:
            return <File size={28} className={styles.defaultIcon} />;
    }
}

export function DocumentAttachmentCard({
    attachment,
    userId,
    roomKey,
    isVault,
}: DocumentAttachmentCardProps) {
    const { objectUrl, isLoading, error } = useMedia({
        mediaId: attachment.id,
        roomKey,
        isVault,
        userId,
        initialUrl: attachment.url,
        downloadOriginal: true,
    });

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!objectUrl || isLoading) {
            return;
        }

        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = attachment.file_name || "document";
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const icon = getFileIcon(attachment.file_name || "");

    const extension =
        attachment.file_name?.split(".").pop()?.toUpperCase() || "FILE";

    return (
        <Flex align="center" gap="3" className={styles.card}>
            <Box className={styles.iconWrapper}>{icon}</Box>

            <Flex direction="column" className={styles.infoWrapper}>
                <Text
                    size="sm"
                    weight="medium"
                    className={styles.fileName}
                    title={attachment.file_name}
                >
                    {attachment.file_name || "Unknown File"}
                </Text>
                <Text size="xs" color="muted">
                    {formatBytes(attachment.file_size || 0)} • {extension}
                </Text>
            </Flex>

            <IconButton
                variant="ghost"
                intent="primary"
                size="sm"
                onClick={handleDownload}
                disabled={isLoading || !!error}
                className={styles.downloadBtn}
            >
                {isLoading ? (
                    <Loader2 size={ICON_SIZE.sm} className={styles.spinner} />
                ) : (
                    <Download size={ICON_SIZE.sm} />
                )}
            </IconButton>
        </Flex>
    );
}
