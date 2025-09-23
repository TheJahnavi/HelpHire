import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { useLocation } from "wouter";

// Simple test to see if the React app is being rendered
console.log("React app is starting...");

// Create a component that includes SpeedInsights with route tracking
function AppWithSpeedInsights() {
  const [location] = useLocation();
  
  return (
    <>
      <App />
      <SpeedInsights route={location} />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <AppWithSpeedInsights />
);