import EvaluationPage from "../pages/EvaluationPage";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import { createBrowserRouter } from "react-router-dom";
import RubricsPage from "../pages/RubricsPage";
import homeLoader from "./loaders/homeLoader";
import evaluationLoader from "./loaders/evaluationLoader";
import rubricsLoader from "./loaders/rubricsLoader";
import Fallback from "../pages/Fallback";
import NotFound from "../components/Fallback/NotFound/NotFound";
import TeamsPage from "../pages/TeamsPage";
import teamsLoader from "./loaders/teamsLoader";
import teamEvaluationsLoader from "./loaders/teamEvaluationsLoader";
import TeamEvaluationsPage from "../pages/TeamEvaluationsPage";

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
      errorElement: <Fallback/>,
      shouldRevalidate: () => false
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
      loader: ({ params }) => rubricsLoader(params.assessment!),
      errorElement: <Fallback/>
    },
    {
      path: "/teams",
      element: <TeamsPage/>,
      loader: teamsLoader,
      errorElement: <Fallback/>,
      shouldRevalidate: () => false
    },
    {
      path: "/teams/:teamId/:assessment",
      element: <TeamEvaluationsPage/>,
      loader: ({ params }) => teamEvaluationsLoader(Number(params.teamId)!, params.assessment!),
      errorElement: <Fallback/>
    },
    {
      path: "*",
      element: <NotFound />
    }
  ])
);
export default router;