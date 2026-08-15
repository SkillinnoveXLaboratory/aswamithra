import { statusTone } from '../utils/format.js';

export default function DataTable({ columns, rows, empty = 'No records yet', actions, compact = false }) {
  if (!rows?.length) {
    return <div className="empty-line">{empty}</div>;
  }

  return (
    <div className={`table-shell${compact ? ' table-compact' : ''}`}>
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
            {actions ? <th className="actions-cell">Action</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id || row.slug || row.orderId || row.cropName}>
              {columns.map((column) => {
                if (column.render) {
                  return <td key={column.key} data-label={column.label}>{column.render(row)}</td>;
                }
                const value = row[column.key];
                const isStatus = column.key.toLowerCase().includes('status');
                return (
                  <td key={column.key} data-label={column.label}>
                    {isStatus ? <span className={`pill ${statusTone(value)}`}>{value}</span> : value}
                  </td>
                );
              })}
              {actions ? <td className="actions-cell" data-label="Action">{actions(row)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
