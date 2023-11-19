import Role from "../enums/Role";

interface IReviewerForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Role;
}
export default IReviewerForm;