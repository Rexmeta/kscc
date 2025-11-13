import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeLanguage } from "./lib/i18n";

// Initialize language before rendering
initializeLanguage();

createRoot(document.getElementById("root")!).render(<App />);
