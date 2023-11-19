import { useLoaderData, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Rubrics from "../components/Rubrics";
import IReviewer from "../interface/IReviewer.view";
import IRubric from "../interface/IRubric.view";
import isAdmin from "../utils/auth/isAdmin";
import Assessment from "../enums/Assessment";

interface IRubricData {
  user: IReviewer;
  rubrics: IRubric[];
  assessment: Assessment;
}

export default function RubricsPage() {
  
  const navigate = useNavigate();
  const location = useLocation();
  const {user, rubrics, assessment} = useLoaderData() as IRubricData;

  return (
    <>
      <Navbar user={user} navigate={navigate} location={location}/>
      <Rubrics isAdmin={isAdmin(user)} rubrics={rubrics} assessment={assessment}/>
    </>
  );
}