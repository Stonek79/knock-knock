import { Box } from '@radix-ui/themes';
import type { ReactNode } from 'react';
import { BREAKPOINTS, useMediaQuery } from '@/hooks/useMediaQuery';
import styles from './settingslayout.module.css';

interface SettingsLayoutProps {
    children: ReactNode;
}

/**
 * Макет страницы настроек.
 * - Desktop: Sidebar + Content
 * - Mobile: Только Content (навигация внутри контента)
 */
export function SettingsLayout({ children }: SettingsLayoutProps) {
    const isMobile = useMediaQuery(BREAKPOINTS.MOBILE);

    if (isMobile) {
        return <Box className={styles.mobileContainer}>{children}</Box>;
    }

    return <Box className={styles.content}>{children}</Box>;
}
