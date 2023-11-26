import BASE_API_URL from "../utils/constants/URL";
import AuthService from "./AuthService";

class RubricService {

  getAllRubrics() : Promise<Response> {
    const requestOptions = {
      headers: Object.assign({ 'Content-Type': 'application/json' }, AuthService.setAuthHeader()),
    };
    return fetch(BASE_API_URL + `/rubrics`, requestOptions);
  }

  getAssessmentRubrics(assessment: string) : Promise<Response> {
    const requestOptions = {
      headers: Object.assign({ 'Content-Type': 'application/json' }, AuthService.setAuthHeader()),
    };
    return fetch(BASE_API_URL + `/rubrics/${assessment}`, requestOptions);
  }

}
export default new RubricService();