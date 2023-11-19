import IReviewer from "../../interface/IReviewer.view";
import Role from "../../enums/Role";

const isAdmin = (user: IReviewer) : boolean => {
  if (user && user.roles.includes(Role.ADMIN))
    return true;

  return false;
}
export default isAdmin;