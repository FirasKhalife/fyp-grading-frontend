import { useNavigate, useLoaderData, useLocation } from "react-router-dom";
import Evaluation from "../components/Evaluation";
import IEvaluation from "../interface/IEvaluation.view";
import IReviewer from "../interface/IReviewer.view";
import Navbar from "../components/Navbar";

interface IEvaluationData {
  user: IReviewer;
  evaluation: IEvaluation;
  teamId: string;
  assessment: string;
}

export default function EvaluationPage() {

  const navigate = useNavigate();
  const location = useLocation();
  const {user, evaluation, teamId, assessment} = useLoaderData() as IEvaluationData;

  return (
    <>
      <Navbar navigate={navigate} user={user} location={location}/>
      <Evaluation evaluation={evaluation} teamId={Number(teamId)} assessment={assessment}/>
    </>
  );
}