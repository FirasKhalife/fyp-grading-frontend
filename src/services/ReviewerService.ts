import IEvaluation from "../interface/IEvaluation.view";
import { ADMIN_API_URL, REVIEW_API_URL } from "../utils/constants/URL";
import AuthService from "./AuthService";

class ReviewerService {

  getAllRubrics() : Promise<Response> {
    const requestOptions = {
      headers: Object.assign({ 'Content-Type': 'application/json' }, AuthService.setAuthHeader()),
    };
    return fetch(ADMIN_API_URL + `/rubrics`, requestOptions);
  }

  getReviewerTeamGrades(reviewerId: number, teamId: number) : Promise<Response> {
    const requestOptions = {
      headers: Object.assign({ 'Content-Type': 'application/json' }, AuthService.setAuthHeader()),
    };
    return fetch(ADMIN_API_URL + `/grades/${reviewerId}/${teamId}`, requestOptions);
  }

  getAssessmentRubrics(assessment: string) : Promise<Response> {
    const requestOptions = {
      headers: Object.assign({ 'Content-Type': 'application/json' }, AuthService.setAuthHeader()),
    };
    return fetch(ADMIN_API_URL + `/rubrics/${assessment}`, requestOptions);
  }

  getReviewerTeams(reviewerId: number) : Promise<Response> {
    const requestOptions = {
      headers: Object.assign({ 'Content-Type': 'application/json' }, AuthService.setAuthHeader()),
    };
    return fetch(ADMIN_API_URL + `/reviewers/${reviewerId}/teams`, requestOptions);
  }

  getReviewerTeamEvaluation(assessment: string, reviewerId: number, teamId: number) : Promise<Response> {
    const requestOptions = {
      headers: Object.assign({ 'Content-Type': 'application/json' }, AuthService.setAuthHeader()),
    };
    return fetch(REVIEW_API_URL + `/evaluations/${assessment}/${reviewerId}/${teamId}`, requestOptions);
  }

  draftEvaluation(evaluation: IEvaluation): Promise<Response> {
    const requestOptions = {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, AuthService.setAuthHeader()),
      body: JSON.stringify(evaluation)
    };
    return fetch(REVIEW_API_URL + `/evaluations/draft`, requestOptions);
  }

  async submitEvaluation(evaluation: IEvaluation) : Promise<Response> {
    const requestOptions = {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, AuthService.setAuthHeader()),
      body: JSON.stringify(evaluation)
    };
    return fetch(REVIEW_API_URL + `/evaluations/submit`, requestOptions);
  }

}
export default new ReviewerService();