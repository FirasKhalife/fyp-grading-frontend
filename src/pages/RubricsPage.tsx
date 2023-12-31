import { useLoaderData } from "react-router-dom";
import Rubrics from "../components/Rubrics";
import IReviewer from "../interface/IReviewer.view";
import IRubric from "../interface/IRubric.view";
import AssessmentEnum from "../enums/AssessmentEnum";
import Navbar from "../components/Navbar";

interface IRubricData {
  user: IReviewer;
  rubrics: IRubric[];
  assessment: AssessmentEnum;
}

export default function RubricsPage() {
  
  const {user, rubrics, assessment} = useLoaderData() as IRubricData;

  const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');

  return (
    <>
      <Navbar user={user} notifications={notifications}/>
      <Rubrics user={user} rubrics={rubrics} assessment={assessment}/>
    </>
  );
}