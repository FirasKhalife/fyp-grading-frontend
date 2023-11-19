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

const getAssessments = () => {
  const roles: Role[] = AuthService.getCurrentUser()!.roles;
  
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

export default Assessment; 
export {getAssessments};