import { useState } from "react";
import type { Role, UserOut } from "../api/client";
import { ROLES, ROLE_LABELS } from "../roles";

interface UserTableProps {
  users: UserOut[];
  currentUserId: number | null;
  onRoleChange: (id: number, role: Role) => void;
  onToggleActive: (id: number, isActive: boolean) => void;
  onDelete: (id: number) => void;
}

export default function UserTable({
  users,
  currentUserId,
  onRoleChange,
  onToggleActive,
  onDelete,
}: UserTableProps) {
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  if (users.length === 0) {
    return <p className="page__text">Keine Benutzer vorhanden.</p>;
  }

  return (
    <div className="table">
      <table>
        <thead>
          <tr>
            <th>E-Mail</th>
            <th>Anzeigename</th>
            <th>Rolle</th>
            <th>Status</th>
            <th className="table__actions-col">Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const confirming = confirmingId === u.id;
            const isSelf = u.id === currentUserId;
            return (
              <tr key={u.id} className={u.is_active ? "" : "table__row--inactive"}>
                <td>{u.email}</td>
                <td>{u.display_name}</td>
                <td>
                  <select
                    className="select"
                    value={u.role}
                    disabled={isSelf}
                    onChange={(e) => onRoleChange(u.id, e.target.value as Role)}
                    aria-label={`Rolle von ${u.display_name}`}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <span
                    className={`badge ${u.is_active ? "badge--active" : "badge--inactive"}`}
                  >
                    {u.is_active ? "Aktiv" : "Deaktiviert"}
                  </span>
                </td>
                <td className="table__actions">
                  {confirming ? (
                    <span className="table__confirm">
                      <span>Löschen?</span>
                      <button
                        type="button"
                        className="btn btn--danger btn--sm"
                        onClick={() => {
                          setConfirmingId(null);
                          onDelete(u.id);
                        }}
                      >
                        Ja
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => setConfirmingId(null)}
                      >
                        Nein
                      </button>
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        disabled={isSelf}
                        onClick={() => onToggleActive(u.id, !u.is_active)}
                      >
                        {u.is_active ? "Deaktivieren" : "Aktivieren"}
                      </button>
                      <button
                        type="button"
                        className="btn btn--danger btn--sm"
                        disabled={isSelf}
                        onClick={() => setConfirmingId(u.id)}
                      >
                        Löschen
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
