import UIKit
import UserNotifications

private let apnsRegistrationSucceeded = Notification.Name("DiaryAPNsRegistrationSucceeded")
private let apnsRegistrationFailed = Notification.Name("DiaryAPNsRegistrationFailed")

@objc(AppDelegate) extension AppDelegate {
  open override func application(_ application: UIApplication,
                                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
    NotificationCenter.default.post(name: apnsRegistrationSucceeded, object: token)
  }

  open override func application(_ application: UIApplication,
                                 didFailToRegisterForRemoteNotificationsWithError error: Error) {
    NotificationCenter.default.post(name: apnsRegistrationFailed, object: error.localizedDescription)
  }
}

@objc(DiaryApnsRegistration)
class DiaryApnsRegistration: CDVPlugin, UNUserNotificationCenterDelegate {
  private var callbackId: String?

  override func pluginInitialize() {
    NotificationCenter.default.addObserver(self, selector: #selector(registrationSucceeded(_:)),
                                           name: apnsRegistrationSucceeded, object: nil)
    NotificationCenter.default.addObserver(self, selector: #selector(registrationFailed(_:)),
                                           name: apnsRegistrationFailed, object: nil)
    UNUserNotificationCenter.current().delegate = self
  }

  @objc(register:)
  func register(_ command: CDVInvokedUrlCommand) {
    self.callbackId = command.callbackId
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
      guard granted, error == nil else {
        self.sendError(error?.localizedDescription ?? "Push-Berechtigung wurde nicht erteilt.")
        return
      }
      DispatchQueue.main.async {
        UIApplication.shared.registerForRemoteNotifications()
      }
    }
  }

  func userNotificationCenter(_ center: UNUserNotificationCenter,
                              willPresent notification: UNNotification,
                              withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    completionHandler([.alert, .sound, .badge])
  }

  @objc private func registrationSucceeded(_ notification: Notification) {
    guard let token = notification.object as? String, let callbackId = self.callbackId else { return }
    let result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: token)
    self.commandDelegate.send(result, callbackId: callbackId)
    self.callbackId = nil
  }

  @objc private func registrationFailed(_ notification: Notification) {
    self.sendError(notification.object as? String ?? "APNs-Registrierung ist fehlgeschlagen.")
  }

  private func sendError(_ message: String) {
    guard let callbackId = self.callbackId else { return }
    let result = CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: message)
    self.commandDelegate.send(result, callbackId: callbackId)
    self.callbackId = nil
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }
}