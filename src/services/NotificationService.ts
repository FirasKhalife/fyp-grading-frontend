import AuthUtils from "../utils/AuthUtils";
import { NOTIFICATION_API_URL } from "../utils/constants/URL";

class NotificationService {

  static readNotification(id: number) {
    const requestOptions = {
      ...AuthUtils.requestHeaders,
      method: 'PUT',
    }
    fetch(NOTIFICATION_API_URL + `/notifications/${id}`, requestOptions);
  }

  static readAllNotifications() {
    const requestOptions = {
      ...AuthUtils.requestHeaders,
      method: 'PUT',
    }
    fetch(NOTIFICATION_API_URL + `/notifications/`, requestOptions);
  }

  static async getNotifications() : Promise<Response> {
    return fetch(NOTIFICATION_API_URL + `/notifications/`, AuthUtils.requestHeaders);
  }

}
export default NotificationService;