import Role from "../enums/Role";

interface IReviewerForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roles: Role[];
}
export default IReviewerForm;