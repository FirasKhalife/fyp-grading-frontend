import { NavigateFunction } from "react-router-dom";
import IAuth from "../interface/IAuth.view";
import IReviewerForm from "../interface/IReviewerForm.view";
import BASE_API_URL from "../utils/constants/URL";
import IReviewer from "../interface/IReviewer.view";

class AuthService {

  static async login(auth: IAuth) : Promise<Response> {
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auth)
    };
    return fetch( BASE_API_URL + '/auth/login', requestOptions);
  }

  static async register(reviewer: IReviewerForm) : Promise<Response> {
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reviewer)
    };
    return fetch( BASE_API_URL + '/auth/signup', requestOptions);
  }

  static logout(navigate: NavigateFunction) {
    localStorage.removeItem('user');
    navigate('/login');
  }

  static getCurrentUser() : IReviewer | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  static setAuthHeader() {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      return { Authorization: '' };
    }
    
    const user: IReviewer = JSON.parse(userStr);
    return { Authorization: 'Bearer ' + user.accessToken };
  }

}
export default AuthService;