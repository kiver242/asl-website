import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import { LessonProgressProvider } from "./context/LessonProgressContext.jsx";

/*
This code renders our project so it can be viewed in a browser. 
*/
ReactDOM.createRoot(document.getElementById("root")).render(
	<React.StrictMode>
		<BrowserRouter>
			<LessonProgressProvider>
				<App />
			</LessonProgressProvider>
		</BrowserRouter>
	</React.StrictMode>
);
