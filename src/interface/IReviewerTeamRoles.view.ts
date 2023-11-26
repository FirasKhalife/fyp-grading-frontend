import RoleEnum from "../enums/RoleEnum";

interface IReviewerTeamRoles {
  reviewerId: number;
  teamId: number;
  roles: RoleEnum[];
}
export default IReviewerTeamRoles;