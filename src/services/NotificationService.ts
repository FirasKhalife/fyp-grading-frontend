import { NOTIFICATION_API_URL } from "../utils/constants/URL";
import AuthService from "./AuthService";

class NotificationService {

  getNotifications() : Promise<Response> {
    const requestOptions = {
      headers: Object.assign({ 'Content-Type': 'application/json' }, AuthService.setAuthHeader()),
    };
    return fetch(NOTIFICATION_API_URL + `/notifications/`, requestOptions);
  }

}
export default new NotificationService();