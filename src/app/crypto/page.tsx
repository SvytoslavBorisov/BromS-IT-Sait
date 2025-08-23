import React from "react";
import CryptoLandingClient from "./CryptoLandingClient"; // клиентский компонент

export const metadata = {
  title: "Broms IT — Криптографические сервисы",
  description:
    "Страница /crypto: логотип, миссия, статьи и открытые инструменты по криптографии ГОСТ и не только.",
  alternates: { canonical: "/crypto" },
};

export default function Page() {
  // можно пробрасывать данные как пропсы, если понадобятся
  return <CryptoLandingClient />;
}
