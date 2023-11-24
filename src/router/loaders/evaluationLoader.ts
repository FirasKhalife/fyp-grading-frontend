import IEvaluation from "../../interface/IEvaluation.view";
import IGradedRubric from "../../interface/IGradedRubric.view";
import IRubric from "../../interface/IRubric.view";
import AuthService from "../../services/AuthService";
import EvaluationService from "../../services/EvaluationService";
import RubricService from "../../services/RubricService";

export default async function evaluationLoader(teamId: number, assessment: string) {

  const user = AuthService.getCurrentUser();
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const evaluationResponse : Response = 
          await EvaluationService.getReviewerTeamEvaluation(assessment, user.id, teamId);
  
  if (evaluationResponse.ok) {
    const evaluation = await evaluationResponse.json();
    return {user: user, evaluation: evaluation, 
            teamId: teamId, assessment: assessment};
  }

  const rubricsResponse : Response = await RubricService.getAssessmentRubrics(assessment);
  const rubrics : IRubric[] = await rubricsResponse.json();

  const gradedRubrics: IGradedRubric[] = rubrics.map(rubric => (
    {name: rubric.name, percentage: rubric.percentage, grade: 0}
  ));
  const evaluation : IEvaluation = {id: null, reviewerId: user.id, assessment:assessment, 
                                    teamId: teamId, gradedRubrics: gradedRubrics};
  

  return {user: user, evaluation: evaluation, 
          teamId: teamId, assessment: assessment};
}