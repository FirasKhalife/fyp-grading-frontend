import { useLoaderData } from "react-router-dom";
import IReviewer from "../interface/IReviewer.view";
import Navbar from "../components/Navbar";
import IGradedEvaluation from "../interface/IGradedEvaluation.view";
import TeamEvaluations from "../components/TeamEvaluations";

interface IEvaluationData {
  user: IReviewer;
  evaluations: IGradedEvaluation[];
}

export default function TeamEvaluationsPage() {

  const {user, evaluations} = useLoaderData() as IEvaluationData;

  const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');

  return (
    <>
      <Navbar user={user} notifications={notifications}/>
      <TeamEvaluations evaluations={evaluations}/>
    </>
  );
}