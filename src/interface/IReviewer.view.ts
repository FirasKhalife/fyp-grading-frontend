import RoleEnum from "../enums/RoleEnum";

interface IReviewer {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  accessToken: string;
  tokenType: string;
  isAdmin: boolean;
  roles: RoleEnum[];
}
export default IReviewer;