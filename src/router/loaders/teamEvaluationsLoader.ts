import IGradedEvaluation from "../../interface/IGradedEvaluation.view";
import IReviewer from "../../interface/IReviewer.view";
import AdminService from "../../services/AdminService";
import AuthUtils from "../../utils/AuthUtils";

export default async function teamEvaluationsLoader(teamId: number, assessment: string) {

  const user: IReviewer = AuthUtils.checkAndGetCurrentUser();

  const evaluationResponse : Response = 
          await AdminService.getTeamEvaluationsByAssessment(teamId, assessment);
  const evaluations : IGradedEvaluation[] = await evaluationResponse.json();

  return {user: user, evaluations: evaluations};
}