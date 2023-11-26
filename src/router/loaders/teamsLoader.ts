import IReviewer from "../../interface/IReviewer.view";
import ITeamGrades from "../../interface/ITeamsGrades.view";
import AdminService from "../../services/AdminService";
import AuthUtils from "../../utils/AuthUtils";

export default async function teamsLoader() {

  const user: IReviewer = AuthUtils.checkAndGetCurrentUser();

  const teamsGradesResponse : Response = await AdminService.getTeamsGrades();
  const teamsGrades : ITeamGrades[] = await teamsGradesResponse.json();

  return {user: user, teamsGrades: teamsGrades};
}