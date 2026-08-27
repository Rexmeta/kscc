import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeLanguage } from "./lib/i18n";

const fontStylesheet = document.createElement("link");
fontStylesheet.rel = "stylesheet";
fontStylesheet.crossOrigin = "anonymous";
fontStylesheet.href =
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Noto+Sans+KR:wght@300;400;500;700;900&family=Noto+Sans+SC:wght@300;400;500;700;900&display=swap";
document.head.appendChild(fontStylesheet);

// Initialize language before rendering
initializeLanguage();

createRoot(document.getElementById("root")!).render(<App />);
