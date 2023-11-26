import IRubric from "../../interface/IRubric.view";
import AuthService from "../../services/AuthService";
import RubricService from "../../services/RubricService";

export default async function rubricsLoader(assessment: string) {
  
  const user = AuthService.getCurrentUser();
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const rubricsResponse : Response = await RubricService.getAssessmentRubrics(assessment);
  const rubrics : IRubric[] = await rubricsResponse.json();

  return {user: user, rubrics: rubrics, assessment: assessment.toUpperCase()};
}