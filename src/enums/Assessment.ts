import IReviewerTeamRoles from "../interface/IReviewerTeamRoles.view";
import AdminService from "../services/AdminService";
import AuthService from "../services/AuthService";
import Role from "./Role";

enum Assessment {
  ORAL_PROPOSAL = 'ORAL_PROPOSAL',
  PROGRESS = 'PROGRESS',
  ADVISOR = 'ADVISOR',
  FINAL_REPORT = 'FINAL_REPORT',
  FINAL_PRESENTATION = 'FINAL_PRESENTATION',

  //for front-end purposes
  ALL = 'ALL',
}

const getAssessmentsByRoles = (roles: Role[]) : Assessment[] => {
  if (roles.includes(Role.ADMIN) 
      || (roles.includes(Role.JURY_MEMBER) && roles.includes(Role.ADVISOR))) {
    return [Assessment.ORAL_PROPOSAL, Assessment.PROGRESS, Assessment.ADVISOR, 
            Assessment.FINAL_REPORT, Assessment.FINAL_PRESENTATION];
  }
  
  if (roles.includes(Role.JURY_MEMBER)) {
    return [Assessment.ORAL_PROPOSAL, Assessment.PROGRESS, Assessment.FINAL_REPORT, 
            Assessment.FINAL_PRESENTATION];
  }

  if (roles.includes(Role.ADVISOR)) {
    return [Assessment.ADVISOR];
  }

  return [];
}

const getReviewerAssessments = () : Assessment[] => {
  const roles: Role[] = AuthService.getCurrentUser()!.roles;
  
  return getAssessmentsByRoles(roles);
}

async function getReviewerTeamAssessments(reviewerId : number, teamId: number) : Promise<Assessment[]> {
  const rolesPromise : Response =  await AdminService.getReviewerTeamRoles(reviewerId, teamId);
  const reviewerTeamRoles : IReviewerTeamRoles = await rolesPromise.json();

  return getAssessmentsByRoles(reviewerTeamRoles.roles);
}

export default Assessment;
export {getReviewerAssessments, getReviewerTeamAssessments};