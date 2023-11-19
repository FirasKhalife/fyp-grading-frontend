import { useLoaderData, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Rubrics from "../components/Rubrics";
import IReviewer from "../interface/IReviewer.view";
import IRubric from "../interface/IRubric.view";
import isAdmin from "../utils/auth/isAdmin";
import Assessment from "../enums/Assessment";

interface IRubricData {
  user: IReviewer;
  rubricsPromise: Promise<IRubric[]>;
  assessment: Assessment;
}

export default function RubricsPage() {
  
  const navigate = useNavigate();
  const {user, rubricsPromise, assessment} = useLoaderData() as IRubricData;

  return (
    <>
      <Navbar user={user} navigate={navigate}/>
      <Rubrics isAdmin={isAdmin(user)} rubricsPromise={rubricsPromise} assessment={assessment}/>
    </>
  );
}