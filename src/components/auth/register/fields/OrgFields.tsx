"use client";
import { inputBase, labelBase } from "../styles";

type Company   = { id: string; title: string };
type Department= { id: string; title: string; companyId: string };
type Position  = { id: string; title: string; companyId: string; rank: number };
type Manager   = { id: string; label: string };

type Props = {
  companyId: string; setCompanyId: (v: string)=>void;
  departmentId: string; setDepartmentId: (v: string)=>void;
  positionId: string; setPositionId: (v: string)=>void;
  managerId: string; setManagerId: (v: string)=>void;

  companies: Company[]; departments: Department[]; positions: Position[]; managersView: Manager[];
};

export default function OrgFields(p: Props) {
  return (
    <>
      <div>
        <label htmlFor="company" className={labelBase}>Компания</label>
        <select id="company" className={inputBase} value={p.companyId}
                onChange={e=>p.setCompanyId(e.target.value)}>
          <option value="">— Не выбрано —</option>
          {p.companies.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="department" className={labelBase}>Отдел</label>
        <select id="department" className={inputBase} value={p.departmentId}
                onChange={e=>p.setDepartmentId(e.target.value)} disabled={!p.companyId}>
          <option value="">— Не выбрано —</option>
          {p.departments
            .filter(d => !p.companyId || d.companyId === p.companyId)
            .map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="position" className={labelBase}>Должность</label>
        <select id="position" className={inputBase} value={p.positionId}
                onChange={e=>p.setPositionId(e.target.value)} disabled={!p.companyId}>
          <option value="">— Не выбрано —</option>
          {p.positions
            .filter(pos => !p.companyId || pos.companyId === p.companyId)
            .map(pos => <option key={pos.id} value={pos.id}>{pos.title}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="manager" className={labelBase}>Начальник</label>
        <select id="manager" className={inputBase} value={p.managerId}
                onChange={e=>p.setManagerId(e.target.value)} disabled={!p.companyId}>
          <option value="">— Не выбрано —</option>
          {p.managersView.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </div>
    </>
  );
}
