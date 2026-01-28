import { Outlet } from '@tanstack/react-router';
import styles from './privatelayout.module.css';

export function PrivateLayout() {
    return (
        <div className={styles.container}>
            <Outlet />
        </div>
    );
}
