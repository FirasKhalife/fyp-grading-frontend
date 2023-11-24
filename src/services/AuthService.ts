import { NavigateFunction } from "react-router-dom";
import IAuth from "../interface/IAuth.view";
import IReviewerForm from "../interface/IReviewerForm.view";
import { ADMIN_API_URL } from "../utils/constants/URL";
import IReviewer from "../interface/IReviewer.view";

class AuthService {

  async login(auth: IAuth) : Promise<{response: Response, data: unknown}> {
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auth)
    };
    const ret : {response: Response, data: unknown} = {response: new Response, data: {}};
    await fetch( ADMIN_API_URL + '/auth/login', requestOptions)
      .then(resp => {
        ret.response = resp;
        return resp.json();
      })
      .then(respData => {
        ret.data = respData;
      })
      .catch(error => console.error(error));

    return ret;
  }

  register(reviewer: IReviewerForm) {
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reviewer)
    };
    return fetch( ADMIN_API_URL + '/auth/signup', requestOptions);
  }

  logout(navigate: NavigateFunction) {
    localStorage.removeItem('user');
    navigate('/login');
  }

  getCurrentUser() : IReviewer | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  setAuthHeader() {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      return { Authorization: '' };
    }
    
    const user: IReviewer = JSON.parse(userStr);
    return { Authorization: 'Bearer ' + user.accessToken };
  }

}
export default new AuthService();