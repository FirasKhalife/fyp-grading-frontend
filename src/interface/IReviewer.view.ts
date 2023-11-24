import Role from "../enums/Role";

interface IReviewer {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  accessToken: string;
  tokenType: string;
  isAdmin: boolean;
  roles: Role[];
}
export default IReviewer;