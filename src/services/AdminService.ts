import IRubric from "../interface/IRubric.view";
import Assessment from "../enums/Assessment";
import { ADMIN_API_URL } from "../utils/constants/URL";
import AuthService from "./AuthService";

class AdminService {

  deleteRubric(rubricId: number) : IRubric[] {
    const requestOptions = {
      method: 'DELETE',
      headers: Object.assign({ 'Content-Type': 'application/json' }, AuthService.setAuthHeader()),
    };
    let rubrics: IRubric[] = [];
    fetch(ADMIN_API_URL + `rubrics/${rubricId}`, requestOptions)
      .then(response => response.json())
      .then(data => {
        console.log(data);
        rubrics = rubrics.filter((r) => r.id !== rubricId);
      })
      .catch(error => console.error(error));
    
    return rubrics;
  }

  addRubric(rubric: IRubric) : IRubric[] {
    const requestOptions = {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, AuthService.setAuthHeader()),
      body: JSON.stringify(rubric)
    };
    let rubrics: IRubric[] = [];
    fetch(ADMIN_API_URL + `/rubrics/`, requestOptions)
      .then(response => response.json())
      .then(data => {
        console.log(data);
        rubrics = [...rubrics, data];
      })
      .catch(error => console.error(error));

    return rubrics;
  }

  updateRubrics(assessment: Assessment, rubrics: IRubric[]) : IRubric[] {
    let updatedRubrics: IRubric[] = [];
    const requestOptions = {
      method: 'PUT',
      headers: Object.assign({ 'Content-Type': 'application/json' }, AuthService.setAuthHeader()),
      body: JSON.stringify(rubrics)
    };
    fetch(ADMIN_API_URL + `/rubrics/${assessment}`, requestOptions)
      .then(response => response.json())
      .then(data => {
        console.log(data);
        updatedRubrics = data;
      })
      .catch(error => console.error(error));

    return updatedRubrics;
  }

  getTeams() {
    const requestOptions = {
      headers: Object.assign({ 'Content-Type': 'application/json' }, AuthService.setAuthHeader()),
    };
    return fetch(ADMIN_API_URL + `/teams/`, requestOptions);
  }

  getReviewers() {
    const requestOptions = {
      headers: Object.assign({ 'Content-Type': 'application/json' }, AuthService.setAuthHeader()),
    };
    return fetch(ADMIN_API_URL + `/reviewers/`, requestOptions);
  }

}
export default new AdminService();