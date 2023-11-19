import Role from "../enums/Role";

interface IJwtResponse {
  id: number;
  email: string;
  accessToken: string;
  tokenType: string;
  roles: Role[];
}
export default IJwtResponse;