import EvaluationPage from "../pages/EvaluationPage";
import NotFoundPage from "../pages/fallback/NotFoundPage";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import { createBrowserRouter } from "react-router-dom";
import RubricsPage from "../pages/RubricsPage";
import homeLoader from "./loaders/homeLoader";
import evaluationLoader from "./loaders/evaluationLoader";
import { allRubricsLoader, assessmentRubricsLoader } from "./loaders/rubricsLoader";

const router = () => (
  
  createBrowserRouter([
    {
      path: "/login",
      element: <LoginPage/>,
    },
    {
      path: "/",
      element: <HomePage/>,
      loader: homeLoader,
      errorElement: <LoginPage/>
    },
    {
      path:"/evaluations/:teamId/:assessment",
      element: <EvaluationPage/>,
      loader: ({ params }) => evaluationLoader(Number(params.teamId!), params.assessment!),
      errorElement: <LoginPage/>
    },
    {
      path: "/rubrics/:assessment",
      element: <RubricsPage/>,
      loader: ({ params }) => assessmentRubricsLoader(params.assessment!),
      errorElement: <LoginPage/>
    },
    {
      path: "/rubrics",
      element: <RubricsPage/>,
      loader: allRubricsLoader,
      errorElement: <LoginPage/>,
    },
    {
      path: "*",
      element: <NotFoundPage />
    }
  ])
);

export default router;