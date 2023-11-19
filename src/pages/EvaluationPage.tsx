import { useNavigate, useLoaderData } from "react-router-dom";
import Evaluation from "../components/Evaluation";
import IEvaluation from "../interface/IEvaluation.view";
import IReviewer from "../interface/IReviewer.view";
import Navbar from "../components/Navbar";

interface IEvaluationData {
  user: IReviewer;
  evaluationPromise: Promise<IEvaluation>;
  teamId: string;
  assessment: string;
}

export default function EvaluationPage() {

  const navigate = useNavigate();
  const {user, evaluationPromise, teamId, assessment} = useLoaderData() as IEvaluationData;

  return (
    <>
      <Navbar navigate={navigate} user={user}/>
      <Evaluation user={user} evaluationPromise={evaluationPromise} teamId={Number(teamId)} assessment={assessment}/>
    </>
  );
}