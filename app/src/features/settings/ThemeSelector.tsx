import { Box, Flex, Grid, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { useThemeStore } from '@/stores/theme';
import styles from './theme-selector.module.css';

export const ThemeSelector = () => {
    const { theme, setTheme, mode, setMode } = useThemeStore();

    return (
        <Flex direction="column" gap="4" className={styles.container}>
            <Text size="4" weight="bold">
                Внешний вид (Appearance)
            </Text>

            {/* Mode Toggle */}
            <Flex gap="3" align="center" className={styles.section}>
                <Text size="2" color="gray">
                    Режим:
                </Text>
                <Flex gap="2">
                    <button
                        type="button"
                        onClick={() => setMode('light')}
                        className={clsx(
                            styles.modeBtn,
                            mode === 'light' && styles.active,
                        )}
                    >
                        Light ☀️
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('dark')}
                        className={clsx(
                            styles.modeBtn,
                            mode === 'dark' && styles.active,
                        )}
                    >
                        Dark 🌑
                    </button>
                </Flex>
            </Flex>

            {/* Theme Grid */}
            <Grid columns="2" gap="4">
                {/* Neon Option */}
                <Box
                    className={clsx(
                        styles.themeCard,
                        theme === 'neon' && styles.selected,
                    )}
                    onClick={() => setTheme('neon')}
                >
                    <Box className={styles.previewNeon} />
                    <Flex justify="between" align="center" mt="2">
                        <Text weight="medium">Cosmic Neon</Text>
                        {theme === 'neon' && (
                            <Text style={{ color: 'var(--accent-primary)' }}>
                                ✓
                            </Text>
                        )}
                    </Flex>
                </Box>

                {/* Emerald Option */}
                <Box
                    className={clsx(
                        styles.themeCard,
                        theme === 'emerald' && styles.selected,
                    )}
                    onClick={() => setTheme('emerald')}
                >
                    <Box className={styles.previewEmerald} />
                    <Flex justify="between" align="center" mt="2">
                        <Text weight="medium">Emerald Luxury</Text>
                        {theme === 'emerald' && (
                            <Text style={{ color: 'var(--accent-primary)' }}>
                                ✓
                            </Text>
                        )}
                    </Flex>
                </Box>
            </Grid>
        </Flex>
    );
};
