import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { SpeedInsights } from "@vercel/speed-insights/react";

// Simple test to see if the React app is being rendered
console.log("React app is starting...");

// Add a simple test element to the DOM
const testElement = document.createElement("div");
testElement.id = "test-element";
testElement.innerHTML = "<h1>React App is Running</h1>";
testElement.style.position = "fixed";
testElement.style.top = "0";
testElement.style.left = "0";
testElement.style.zIndex = "9999";
testElement.style.backgroundColor = "red";
testElement.style.color = "white";
testElement.style.padding = "10px";
document.body.appendChild(testElement);

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <SpeedInsights />
  </>
);