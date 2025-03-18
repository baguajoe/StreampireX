import React from "react";
import { useTranslation } from "react-i18next";

const LandingPage = () => {
  const { t, i18n } = useTranslation();

  return (
    <div>
      <select onChange={(e) => i18n.changeLanguage(e.target.value)}>
        <option value="en">English</option>
        <option value="es">Español</option>
        <option value="fr">Français</option>
        <option value="zh-CN">简体中文</option>
        <option value="zh-TW">繁體中文</option>
      </select>
      <h1>{t("welcome")}</h1>
      <p>{t("description")}</p>
      <button>{t("kickstarter")}</button>
    </div>
  );
};

export default LandingPage;
