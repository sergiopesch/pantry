// grok: drive Grok Bot through the macOS accessibility API. No keystrokes, no mouse moves, and Grok Bot
// doesn't have to be in front, so nothing can land in another app by mistake.
//   grok prompt "<text>"    put the text in Pantry's message box (doesn't send)
//   grok send               press Send message
//   grok pantry             open Pantry's chat
//   grok image [n]          open the nth-from-last card in the chat full screen (1 = the latest)
//   grok close              close the full-screen image (or any open dialog)
//   grok compact on|off     the compact sidebar (on hides the other Bots' names)
//   grok fill [left|right]  fit the window to the screen it's on, below the menu bar (or its left/right half)
//   grok at x y w h         move and size the window (points, top-left origin)
//   grok state              JSON: frontmost app, chat, composer text, send button, window frame
// Needs Accessibility for the terminal (or app) that runs it.
import AppKit
import ApplicationServices

func attr(_ e: AXUIElement, _ n: String) -> AnyObject? { var v: AnyObject?; return AXUIElementCopyAttributeValue(e, n as CFString, &v) == .success ? v : nil }
func str(_ e: AXUIElement, _ n: String) -> String { (attr(e, n) as? String) ?? "" }
func frame(_ e: AXUIElement) -> CGRect {
  var p = CGPoint.zero, s = CGSize.zero
  if let v = attr(e, kAXPositionAttribute) { AXValueGetValue(v as! AXValue, .cgPoint, &p) }
  if let v = attr(e, kAXSizeAttribute) { AXValueGetValue(v as! AXValue, .cgSize, &s) }
  return CGRect(origin: p, size: s)
}
func label(_ e: AXUIElement) -> String { let d = str(e, kAXDescriptionAttribute); return d.isEmpty ? str(e, kAXTitleAttribute) : d }
func die(_ m: String) -> Never { FileHandle.standardError.write((m + "\n").data(using: .utf8)!); exit(1) }

guard let app = NSRunningApplication.runningApplications(withBundleIdentifier: "com.anysphere.sand").first else { die("Grok Bot isn't running.") }
let ax = AXUIElementCreateApplication(app.processIdentifier)
AXUIElementSetAttributeValue(ax, "AXManualAccessibility" as CFString, kCFBooleanTrue)

func elements() -> [AXUIElement] {
  var out: [AXUIElement] = []
  func walk(_ e: AXUIElement, _ d: Int) {
    if d > 64 || out.count > 30000 { return }
    out.append(e)
    if let kids = attr(e, kAXChildrenAttribute) as? [AXUIElement] { for k in kids { walk(k, d + 1) } }
  }
  for w in (attr(ax, kAXWindowsAttribute) as? [AXUIElement]) ?? [] { walk(w, 0) }
  return out
}
func find(_ role: String, _ name: String) -> [AXUIElement] { elements().filter { str($0, kAXRoleAttribute) == role && label($0) == name } }
func press(_ e: AXUIElement) -> Bool { AXUIElementPerformAction(e, kAXPressAction as CFString) == .success }
func mainWindow() -> AXUIElement? {
  ((attr(ax, kAXWindowsAttribute) as? [AXUIElement]) ?? []).first { str($0, kAXSubroleAttribute) == "AXStandardWindow" }
}
func composer() -> AXUIElement? { elements().first { str($0, kAXRoleAttribute) == "AXTextArea" && label($0) == "Prompt" } }
// The chat header names the Bot whose conversation is open.
func chatName() -> String {
  guard let header = find("AXButton", "View conversation details").first else { return "" }
  var name = ""
  func walk(_ e: AXUIElement) { if name.isEmpty, str(e, kAXRoleAttribute) == "AXStaticText" { name = str(e, kAXValueAttribute) }; for k in (attr(e, kAXChildrenAttribute) as? [AXUIElement]) ?? [] { walk(k) } }
  walk(header)
  return name
}
func setFrame(_ r: CGRect) {
  guard let w = mainWindow() else { die("No Grok Bot window.") }
  var p = r.origin, s = r.size
  AXUIElementSetAttributeValue(w, kAXPositionAttribute as CFString, AXValueCreate(.cgPoint, &p)!)
  AXUIElementSetAttributeValue(w, kAXSizeAttribute as CFString, AXValueCreate(.cgSize, &s)!)
}
// The visible frame (below the menu bar) of the screen the window is on, in top-left coordinates.
func screenFrame() -> CGRect {
  let primary = NSScreen.screens[0].frame
  let wf = mainWindow().map(frame) ?? .zero
  let screen = NSScreen.screens.first { s in let f = s.frame; let top = CGRect(x: f.minX, y: primary.maxY - f.maxY, width: f.width, height: f.height); return top.contains(CGPoint(x: wf.midX, y: wf.midY)) } ?? NSScreen.main ?? NSScreen.screens[0]
  let v = screen.visibleFrame
  return CGRect(x: v.minX, y: primary.maxY - v.maxY, width: v.width, height: v.height)
}
func waitFor(_ ok: () -> Bool, _ seconds: Double = 4) -> Bool {
  let end = Date().addingTimeInterval(seconds)
  while Date() < end { if ok() { return true }; usleep(120_000) }
  return ok()
}

let a = CommandLine.arguments
switch a.count > 1 ? a[1] : "" {
case "pantry":
  if chatName() == "Pantry" { print("Pantry's chat is open"); break }
  guard let item = find("AXButton", "Pantry").first, press(item) else { die("Couldn't find Pantry in the sidebar.") }
  print(waitFor({ chatName() == "Pantry" }) ? "Pantry's chat is open" : "opened, but the header says \(chatName())")
case "prompt":
  guard a.count > 2 else { die("usage: grok prompt \"<text>\"") }
  if chatName() != "Pantry" { die("The open chat is \(chatName().isEmpty ? "unknown" : chatName()), not Pantry. Run: grok pantry") }
  guard let field = composer() else { die("No message box.") }
  AXUIElementSetAttributeValue(field, kAXValueAttribute as CFString, a[2] as CFString)
  print(waitFor({ !find("AXButton", "Send message").isEmpty }, 2) ? "ready to send" : "text set (no Send button yet)")
case "send":
  if chatName() != "Pantry" { die("The open chat isn't Pantry's. Nothing sent.") }
  guard let b = find("AXButton", "Send message").first else { die("Nothing to send: the message box is empty.") }
  print(press(b) && waitFor({ find("AXButton", "Send message").isEmpty }, 3) ? "sent" : "pressed Send; check Grok Bot")
case "image":
  let n = a.count > 2 ? max(1, Int(a[2]) ?? 1) : 1
  let images = find("AXButton", "Open image full screen")
  guard images.count >= n else { die("Only \(images.count) images in view.") }
  print(press(images[images.count - n]) ? "opened image \(n) from the end" : "couldn't open it")
case "close":
  let close = elements().filter { str($0, kAXRoleAttribute) == "AXButton" && ["Close", "Close image", "Close viewer", "Close full screen"].contains(label($0)) }
  guard let c = close.last else { die("Nothing open to close.") }
  print(press(c) ? "closed" : "couldn't close")
case "compact":
  let want = a.count > 2 ? a[2] == "on" : true
  let isCompact = !elements().contains { str($0, kAXRoleAttribute) == "AXStaticText" && str($0, kAXValueAttribute) == "Voco Community" }
  if want == isCompact { print("compact sidebar is \(want ? "on" : "off")"); break }
  guard let t = find("AXButton", "Toggle compact sidebar").first, press(t) else { die("No sidebar toggle.") }
  print("compact sidebar \(want ? "on" : "off")")
case "fill":
  let s = screenFrame()
  let side = a.count > 2 ? a[2] : "full"
  let half = (s.width / 2).rounded()
  setFrame(side == "left" ? CGRect(x: s.minX, y: s.minY, width: half, height: s.height) : side == "right" ? CGRect(x: s.minX + half, y: s.minY, width: s.width - half, height: s.height) : s)
  print("window", mainWindow().map(frame).map { "\(Int($0.minX)),\(Int($0.minY)) \(Int($0.width))x\(Int($0.height))" } ?? "?")
case "at":
  guard a.count > 5, let x = Double(a[2]), let y = Double(a[3]), let w = Double(a[4]), let h = Double(a[5]) else { die("usage: grok at x y w h") }
  setFrame(CGRect(x: x, y: y, width: w, height: h))
  print("window", mainWindow().map(frame).map { "\(Int($0.minX)),\(Int($0.minY)) \(Int($0.width))x\(Int($0.height))" } ?? "?")
case "state":
  let f = mainWindow().map(frame) ?? .zero
  let text = composer().map { str($0, kAXValueAttribute).trimmingCharacters(in: .whitespacesAndNewlines) } ?? ""
  let obj: [String: Any] = ["front": NSWorkspace.shared.frontmostApplication?.localizedName ?? "", "chat": chatName(), "composer": text,
    "canSend": !find("AXButton", "Send message").isEmpty, "images": find("AXButton", "Open image full screen").count,
    "window": [Int(f.minX), Int(f.minY), Int(f.width), Int(f.height)]]
  print(String(data: try! JSONSerialization.data(withJSONObject: obj, options: [.sortedKeys]), encoding: .utf8)!)
default:
  print("usage: grok pantry | prompt \"<text>\" | send | image [n] | close | compact on|off | fill [left|right] | at x y w h | state")
}
