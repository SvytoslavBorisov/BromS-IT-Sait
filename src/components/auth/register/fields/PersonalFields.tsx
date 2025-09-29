"use client";
import { inputBase, labelBase } from "../styles";

type Props = {
  name: string; setName: (v: string)=>void;
  surname: string; setSurname: (v: string)=>void;
  patronymic: string; setPatronymic: (v: string)=>void;
  age: string; setAge: (v: string)=>void;
  sex: "MALE" | "FEMALE"; setSex: (v: "MALE" | "FEMALE")=>void;
  clearError?: ()=>void;
};

export default function PersonalFields(p: Props) {
  const ce = () => p.clearError?.();
  return (
    <>
      <div>
        <label htmlFor="name" className={labelBase}>Имя</label>
        <input id="name" className={inputBase} value={p.name}
               onChange={e=>{p.setName(e.target.value); ce();}} placeholder="Иван"/>
      </div>

      <div>
        <label htmlFor="surname" className={labelBase}>Фамилия</label>
        <input id="surname" className={inputBase} value={p.surname}
               onChange={e=>{p.setSurname(e.target.value); ce();}} placeholder="Иванов"/>
      </div>

      {/* <div>
        <label htmlFor="patronymic" className={labelBase}>Отчество</label>
        <input id="patronymic" className={inputBase} value={p.patronymic}
               onChange={e=>{p.setPatronymic(e.target.value); ce();}} placeholder="Иванович"/>
      </div> */}

      <div>
        <label htmlFor="age" className={labelBase}>Дата рождения</label>
        <input id="age" type="date" className={inputBase} value={p.age}
               onChange={e=>{p.setAge(e.target.value); ce();}}/>
      </div>

      {/* <div>
        <label htmlFor="sex" className={labelBase}>Пол</label>
        <select id="sex" className={inputBase} value={p.sex}
                onChange={e=>{p.setSex(e.target.value as any); ce();}}>
          <option value="MALE">Мужской</option>
          <option value="FEMALE">Женский</option>
        </select>
      </div> */}
    </>
  );
}
