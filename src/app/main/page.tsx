import fs from "fs/promises";
import path from "path";
import styles from "./page.module.css";
export const dynamic = "force-dynamic";


// общая функция чтения и подстановки шаблона
async function renderTemplate(
  filePath: string,
  replacements: Record<string, string>
): Promise<string> {
  const tpl = await fs.readFile(filePath, "utf8");
  return Object.entries(replacements).reduce(
    (html, [key, val]) => html.replaceAll(`{{ ${key} }}`, val),
    tpl
  );
}

export default async function MainPage() {

  //  // разбили секрет на 5 частей, порог 3
  // const shares = splitSecret('super-секретный-ключ', 5, 3);

  // // собрали обратно (например, первые 3 доли)
  // const recovered = combineSecret(shares.slice(0, 3));

  // console.log('Recovered:', recovered.toString('utf8'));
  // console.log(<pre>{JSON.stringify(shares.map(s=>s.toString('hex')), null, 2)}</pre>);


  const templatesDir = path.join(process.cwd(), "src", "templates");

  return (
    <div className={styles.wrapper}>

    </div>
  );
}
