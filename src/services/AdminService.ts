import AuthUtils from "../utils/AuthUtils";
import { ADMIN_API_URL } from "../utils/constants/URL";

class AdminService {

  static async getReviewerHomeData(reviewerId: number) : Promise<Response> {
    return fetch(
      ADMIN_API_URL + `/reviewers/${reviewerId}/home`, AuthUtils.requestHeaders
     );
  }

  static async getTeamEvaluationsByAssessment(teamId: number, assessment: string) : Promise<Response> {
    return fetch(
      ADMIN_API_URL + `/admin/teams/${teamId}/evaluations/${assessment}`, AuthUtils.requestHeaders
    );
  }

  static async getTeamsGrades() : Promise<Response> {
    return fetch(
      ADMIN_API_URL + `/admin/teams/grades`, AuthUtils.requestHeaders
    );
  }

  static async getReviewerTeamRoles(reviewerId: number, teamId: number) : Promise<Response> {
    return fetch(
      ADMIN_API_URL + `/reviewers/${reviewerId}/teams/${teamId}/roles`, AuthUtils.requestHeaders
    );
  }

  static async getTeams() {
    return fetch(ADMIN_API_URL + `/teams/`, AuthUtils.requestHeaders);
  }

  static async getReviewers() {
    return fetch(ADMIN_API_URL + `/reviewers/`, AuthUtils.requestHeaders);
  }

  static async getReviewerTeamGrades(reviewerId: number, teamId: number) : Promise<Response> {
    return fetch(ADMIN_API_URL + `/grades/${reviewerId}/${teamId}`, AuthUtils.requestHeaders);
  }

  static async getReviewerTeams(reviewerId: number) : Promise<Response> {
    return fetch(ADMIN_API_URL + `/reviewers/${reviewerId}/teams`, AuthUtils.requestHeaders);
  }

}
export default AdminService;