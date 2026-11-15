import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { LawFirms } from "./views/LawFirms";
import { MedicalPractices } from "./views/MedicalPractices";
import { Pricing } from "./views/Pricing";
import "./styles.css";

const path = window.location.pathname.replace(/\/+$/, "");
const Page =
  path === "/law-firms"
    ? LawFirms
    : path === "/medical-practices"
      ? MedicalPractices
      : path === "/pricing"
        ? Pricing
        : App;

const root = document.getElementById("root")!;
const tree = (
  <React.StrictMode>
    <Page />
  </React.StrictMode>
);

// Pages are rendered to HTML at build time; attach to that markup when present.
if (root.hasChildNodes()) ReactDOM.hydrateRoot(root, tree);
else ReactDOM.createRoot(root).render(tree);
