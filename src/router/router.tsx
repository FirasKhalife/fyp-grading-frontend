import EvaluationPage from "../pages/EvaluationPage";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import { createBrowserRouter } from "react-router-dom";
import RubricsPage from "../pages/RubricsPage";
import homeLoader from "./loaders/homeLoader";
import evaluationLoader from "./loaders/evaluationLoader";
import { allRubricsLoader, assessmentRubricsLoader } from "./loaders/rubricsLoader";
import Fallback from "../pages/Fallback";
import NotFound from "../components/Fallback/NotFound/NotFound";

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
      errorElement: <Fallback/>
    },
    {
      path:"/evaluations/:teamId/:assessment",
      element: <EvaluationPage/>,
      loader: ({ params }) => evaluationLoader(Number(params.teamId!), params.assessment!),
      errorElement: <Fallback/>
    },
    {
      path: "/rubrics/:assessment",
      element: <RubricsPage/>,
      loader: ({ params }) => assessmentRubricsLoader(params.assessment!),
      errorElement: <Fallback/>
    },
    {
      path: "/rubrics",
      element: <RubricsPage/>,
      loader: allRubricsLoader,
      errorElement: <Fallback/>,
    },
    {
      path: "*",
      element: <NotFound />
    }
  ])
);
export default router;