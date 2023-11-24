import IRubric from "../../interface/IRubric.view";
import AuthService from "../../services/AuthService";
import Assessment from "../../enums/Assessment";
import RubricService from "../../services/RubricService";

async function allRubricsLoader() {
  
  const user = AuthService.getCurrentUser();
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const rubricsResponse : Response = await RubricService.getAllRubrics();
  const rubrics : IRubric[] = await rubricsResponse.json();

  console.log('in allRubricsLoader:' + rubrics);

  return {user: user, rubrics: rubrics, assessment: Assessment.ALL};
}

async function assessmentRubricsLoader(assessment: string) {
  
  const user = AuthService.getCurrentUser();
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const rubricsResponse : Response = await RubricService.getAssessmentRubrics(assessment);
  const rubrics : IRubric[] = await rubricsResponse.json();

  console.log('in assessmentRubricsLoader:' + rubrics);

  return {user: user, rubrics: rubrics, assessment: assessment};
}

export { allRubricsLoader, assessmentRubricsLoader };