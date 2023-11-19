import IEvaluation from "../interface/IEvaluation.view";
import IGrade from "../interface/IGrade.view";
import IRubric from "../interface/IRubric.view";
import ITeam from "../interface/ITeam.view";
import { ADMIN_API_URL, REVIEW_API_URL } from "../utils/constants/URL";
import AuthService from "./AuthService";

class ReviewerService {

  async getAllRubrics() : Promise<IRubric[]> {
    const requestOptions = {
      headers: Object.assign({ 'Content-Type': 'application/json' }, AuthService.setAuthHeader()),
    };
    let rubrics: IRubric[] = [];
    await fetch(ADMIN_API_URL + `/rubrics`, requestOptions)
      .then(response => response.json())
      .then(data => {
        console.log(data);
        rubrics = data;
      })
      .catch(error => console.log(error));
    
    return rubrics;
  }

  async getReviewerTeamGrades(reviewerId: number, teamId: number) : Promise<IGrade[]> {
    const requestOptions = {
      headers: Object.assign({ 'Content-Type': 'application/json' }, AuthService.setAuthHeader()),
    };
    let grades : IGrade[] = [];
    await fetch(ADMIN_API_URL + `/grades/${reviewerId}/${teamId}`, requestOptions)
      .then(response => {
        if (response.status === 404)
          throw new Error(response.statusText);
        return response.json();
      })
      .then(data => {
        console.log(data);
        grades = data;
      })
      .catch((error) => console.log(error));
    
    return grades;
  }

  async getAssessmentRubrics(assessment: string) : Promise<IRubric[]> {
    const requestOptions = {
      headers: Object.assign({ 'Content-Type': 'application/json' }, AuthService.setAuthHeader()),
    };
    let rubrics: IRubric[] = [];
    await fetch(ADMIN_API_URL + `/rubrics/${assessment}`, requestOptions)
      .then(response => response.json())
      .then(data => {
        console.log(data);
        rubrics = data;
      })
      .catch(error => console.log(error));
    
    return rubrics;
  }

  async getReviewerTeams(reviewerId: number) : Promise<ITeam[]> {
    const requestOptions = {
      headers: Object.assign({ 'Content-Type': 'application/json' }, AuthService.setAuthHeader()),
    };
    let teams: ITeam[] = [];
    await fetch(ADMIN_API_URL + `/reviewers/${reviewerId}/teams`, requestOptions)
      .then (response => response.json())
      .then (data => teams = data)
      .catch(error => console.error(error));

    return teams;
  }

  async getReviewerTeamEvaluation(assessment: string, reviewerId: number, teamId: number) : Promise<IEvaluation | null> {
    const requestOptions = {
      headers: Object.assign({ 'Content-Type': 'application/json' }, AuthService.setAuthHeader()),
    };
    let evaluation = null;
    await fetch(REVIEW_API_URL + `/evaluations/${assessment}/${reviewerId}/${teamId}`, requestOptions)
      .then(response => {
        if (response.status === 404)
          throw new Error(response.statusText);
        return response.json();
      })
      .then(data => {
        console.log(data);
        evaluation = data;
      })
      .catch(() => {
        console.log("No evaluation found. Needs creating a new evaluation.");
      });
    
    return evaluation;
  }

  async draftEvaluation(evaluation: IEvaluation): Promise<IEvaluation | null> {
    const requestOptions = {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, AuthService.setAuthHeader()),
      body: JSON.stringify(evaluation)
    };
    let draftedEvaluation = null;
    await fetch(REVIEW_API_URL + `/evaluations/draft`, requestOptions)
      .then(response => response.json())
      .then(data => {
        console.log(data);
        draftedEvaluation = data;
      })
      .catch(error => console.error(error));
    
    return draftedEvaluation;
  }

  async submitEvaluation(evaluation: IEvaluation) : Promise<IEvaluation | null> {
    const requestOptions = {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, AuthService.setAuthHeader()),
      body: JSON.stringify(evaluation)
    };
    let submittedEvaluation = null;
    await fetch(REVIEW_API_URL + `/evaluations/submit`, requestOptions)
      .then(response => response.json())
      .then((data: IEvaluation) => {
        console.log(data);
        submittedEvaluation = data
      })
      .catch(error => console.error(error));
    
    return submittedEvaluation;
  }

}
export default new ReviewerService();