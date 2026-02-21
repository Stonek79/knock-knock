import clsx from "clsx";
import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import styles from "./table.module.css";

export const Root = ({
    className,
    ...props
}: HTMLAttributes<HTMLTableElement>) => (
    <div className={styles.container}>
        <table className={clsx(styles.table, className)} {...props} />
    </div>
);

export const Header = ({
    className,
    ...props
}: HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className={clsx(styles.header, className)} {...props} />
);

export const Body = ({
    className,
    ...props
}: HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody className={clsx(styles.body, className)} {...props} />
);

export const Row = ({
    className,
    ...props
}: HTMLAttributes<HTMLTableRowElement>) => (
    <tr className={clsx(styles.row, className)} {...props} />
);

export const ColumnHeaderCell = ({
    className,
    ...props
}: ThHTMLAttributes<HTMLTableCellElement>) => (
    <th
        className={clsx(styles.cell, styles.columnHeaderCell, className)}
        {...props}
    />
);

export const RowHeaderCell = ({
    className,
    ...props
}: ThHTMLAttributes<HTMLTableCellElement>) => (
    <th
        className={clsx(styles.cell, styles.rowHeaderCell, className)}
        {...props}
    />
);

export const Cell = ({
    className,
    ...props
}: TdHTMLAttributes<HTMLTableCellElement>) => (
    <td className={clsx(styles.cell, className)} {...props} />
);

export const Table = {
    Root,
    Header,
    Body,
    Row,
    ColumnHeaderCell,
    RowHeaderCell,
    Cell,
};
