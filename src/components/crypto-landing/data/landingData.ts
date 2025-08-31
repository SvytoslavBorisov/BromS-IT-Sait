import { Shield, Lock, KeyRound, ScrollText, Wrench, Globe } from "lucide-react";

export const features = [
  { icon: Shield, title: "Безопасность по умолчанию", text: "Проектируем сервисы с защитой данных и приватностью на первом месте." },
  { icon: Lock, title: "ГОСТ и международные стандарты", text: "Поддержка алгоритмов Стрибог, ГОСТ Р 34.10-2012, а также современных стандартов." },
  { icon: KeyRound, title: "Пороговые схемы", text: "Секрет-шеринг, верифицируемое распределение долей и восстановление без ЦДУ." },
];

export const articlePlaceholders = [
  { tag: "Криптография", title: "Введение в пороговые схемы (Shamir, Feldman VSS)", excerpt: "Теория и практические нюансы в веб-сервисах.", link: "/crypto/blog/shamir-threshold" },
  { tag: "ГОСТ", title: "Стрибог-256 на практике", excerpt: "Интеграция, ошибки имплементации и тест-вектора.", link: "/crypto/blog/shamir-threshold" },
  { tag: "PKI", title: "CMS/CAdES-BES в веб-приложении", excerpt: "Форматы, идентификаторы подписанта и совместимость.", link: "/crypto/blog/shamir-threshold" },
];

export const publicTools = [
  { icon: Wrench,    title: "Хэш-утилита",       text: "Проверка/генерация хэшей (Стрибог-256, SHA-2/3)", link: "/crypto/random" },
  { icon: KeyRound,  title: "Генерация ключей",  text: "Демо-генерация пар ключей (локально, без сервера)", link: "/crypto/random" },
  { icon: ScrollText,title: "Проверка подписи",  text: "Проверить подпись файла/строки в браузере", link: "/crypto/random" },
  { icon: Globe,     title: "Случайность",       text: "Калькулятор энтропии и генератор случайных строк", link: "/crypto/random" },
];

export const gamesList = [
  { title: "Geometry Dash Clone", desc: "Мини-аркада с прыжками через препятствия", link: "/games/geometry" },
  { title: "Top-Down 2D", desc: "Вид сверху: движение, бой и выживание", link: "/games/platformer" },
  { title: "Security Inspector", desc: "Симулятор инспектора на границе (Papers, Please style)", link: "/games/inspector" },
];
