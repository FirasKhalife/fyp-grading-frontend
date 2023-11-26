import IReviewer from "../../interface/IReviewer.view";
import EvaluationService from "../../services/EvaluationService";
import AuthUtils from "../../utils/AuthUtils";

export default async function evaluationLoader(teamId: number, assessment: string) {

  const user: IReviewer = AuthUtils.checkAndGetCurrentUser();

  const evaluationResponse : Response = 
              await EvaluationService.getReviewerTeamEvaluation(assessment, user.id, teamId);
  const evaluation = await evaluationResponse.json();

  return {user: user, evaluation: evaluation};
}