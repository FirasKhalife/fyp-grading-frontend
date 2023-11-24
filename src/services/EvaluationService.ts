import IEvaluation from "../interface/IEvaluation.view";
import { EVALUATION_API_URL } from "../utils/constants/URL";
import AuthService from "./AuthService";

class EvaluationService {

  getReviewerTeamEvaluation(assessment: string, reviewerId: number, teamId: number) : Promise<Response> {
    const requestOptions = {
      headers: Object.assign({ 'Content-Type': 'application/json' }, AuthService.setAuthHeader()),
    };
    return fetch(EVALUATION_API_URL + `/evaluations/${assessment}/${reviewerId}/${teamId}`, requestOptions);
  }

  draftEvaluation(evaluation: IEvaluation): Promise<Response> {
    const requestOptions = {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, AuthService.setAuthHeader()),
      body: JSON.stringify(evaluation)
    };
    return fetch(EVALUATION_API_URL + `/evaluations/draft`, requestOptions);
  }

  async submitEvaluation(evaluation: IEvaluation) : Promise<Response> {
    const requestOptions = {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, AuthService.setAuthHeader()),
      body: JSON.stringify(evaluation)
    };
    return fetch(EVALUATION_API_URL + `/evaluations/submit`, requestOptions);
  }

}
export default new EvaluationService();