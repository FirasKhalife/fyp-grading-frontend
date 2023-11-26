import IEvaluation from "../interface/IEvaluation.view";
import AuthUtils from "../utils/AuthUtils";
import { EVALUATION_API_URL } from "../utils/constants/URL";

class EvaluationService {

  static async getReviewerTeamEvaluation(assessment: string, reviewerId: number, teamId: number) : Promise<Response> {
    return fetch(EVALUATION_API_URL + `/evaluations/${assessment}/${reviewerId}/${teamId}`, AuthUtils.requestHeaders);
  }

  static async draftEvaluation(evaluation: IEvaluation): Promise<Response> {
    const requestOptions = {
      ...AuthUtils.requestHeaders,
      method: 'POST',
      body: JSON.stringify(evaluation)
    };
    return fetch(EVALUATION_API_URL + `/evaluations/draft`, requestOptions);
  }

  static async submitEvaluation(evaluation: IEvaluation) : Promise<Response> {
    const requestOptions = {
      ...AuthUtils.requestHeaders,
      method: 'POST',
      body: JSON.stringify(evaluation)
    };
    return fetch(EVALUATION_API_URL + `/evaluations/submit`, requestOptions);
  }

}
export default EvaluationService;