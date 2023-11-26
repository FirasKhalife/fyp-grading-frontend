import AssessmentEnum from "../enums/AssessmentEnum";
import IRubric from "../interface/IRubric.view";
import AuthUtils from "../utils/AuthUtils";
import { RUBRIC_API_URL } from "../utils/constants/URL";

class RubricService {

  static async getAllRubrics() : Promise<Response> {
    return fetch(RUBRIC_API_URL + `/rubrics`, AuthUtils.requestHeaders);
  }

  static async getAssessmentRubrics(assessment: string) : Promise<Response> {
    return fetch(RUBRIC_API_URL + `/rubrics/${assessment}`, AuthUtils.requestHeaders);
  }

  static async addRubric(rubric: IRubric) : Promise<Response> {
    const requestOptions = {
      ...AuthUtils.requestHeaders,
      method: 'POST',
      body: JSON.stringify(rubric)
    };
    return fetch(RUBRIC_API_URL + `/rubrics/`, requestOptions);
  }

  static async updateRubrics(assessment: AssessmentEnum, rubrics: IRubric[]) : Promise<Response> {
    const requestOptions = {
      ...AuthUtils.requestHeaders,
      method: 'PUT',
      body: JSON.stringify(rubrics)
    };
    return fetch(RUBRIC_API_URL + `/rubrics/${assessment}`, requestOptions);
  }

  static async deleteRubric(rubricId: number) : Promise<Response> {
    const requestOptions = {
      ...AuthUtils.requestHeaders,
      method: 'DELETE',
    };
    return fetch(RUBRIC_API_URL + `rubrics/${rubricId}`, requestOptions);
  }

}
export default RubricService;