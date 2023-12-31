import { useLoaderData } from "react-router-dom";
import Evaluation from "../components/Evaluation";
import IEvaluation from "../interface/IEvaluation.view";
import IReviewer from "../interface/IReviewer.view";
import Navbar from "../components/Navbar";

interface IEvaluationData {
  user: IReviewer;
  evaluation: IEvaluation;
}

export default function EvaluationPage() {

  const {user, evaluation} = useLoaderData() as IEvaluationData;

  const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');

  return (
    <>
      <Navbar user={user} notifications={notifications}/>
      <Evaluation evaluation={evaluation}/>
    </>
  );
}