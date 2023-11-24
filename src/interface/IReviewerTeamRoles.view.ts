import Role from "../enums/Role";

interface IReviewerTeamRoles {
  reviewerId: number;
  teamId: number;
  roles: Role[];
}
export default IReviewerTeamRoles;