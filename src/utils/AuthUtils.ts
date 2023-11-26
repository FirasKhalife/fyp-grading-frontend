import IReviewer from "../interface/IReviewer.view";
import AuthService from "../services/AuthService";

export default class AuthUtils {

  static requestHeaders = {
    headers: Object.assign({ 'Content-Type': 'application/json' }, AuthService.setAuthHeader()),
  };

  static checkAndGetCurrentUser = () : IReviewer => {
    const user = AuthService.getCurrentUser();
    if (!user) {
      throw new Response("Unauthorized", { status: 401 });
    }

    return user;
  }

}