import type { ReactNode } from 'react';

type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
};

type AdminTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  onEdit: (row: T) => void;
  onDelete: (row: T) => void;
};

const AdminTable = <T extends { id?: number | string }>({
  data,
  columns,
  onEdit,
  onDelete,
}: AdminTableProps<T>) => (
  <div className="admin-table">
    <table>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key}>{column.label}</th>
          ))}
          <th style={{ width: '140px' }}>Дії</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={(row as any).id ?? JSON.stringify(row)}>
            {columns.map((column) => (
              <td key={column.key}>
                {column.render ? column.render(row) : String(row[column.key as keyof T] ?? '')}
              </td>
            ))}
            <td className="admin-actions">
              <button type="button" className="ghost-button" onClick={() => onEdit(row)}>
                Редагувати
              </button>
              <button type="button" className="ghost-button danger" onClick={() => onDelete(row)}>
                Видалити
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default AdminTable;

