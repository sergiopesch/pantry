// screenrec: record one window (by owner app name) or one display to an H.264 .mov with ScreenCaptureKit.
//   screenrec --window "Grok Bot" --out grok.mov [--fps 60] [--seconds 30]
//   screenrec --display 1 --out deck.mov          (display index in CGGetActiveDisplayList order, 1-based)
// Stops after --seconds, or on SIGINT/SIGTERM, and finishes the file cleanly. No cursor.
import AVFoundation
import CoreMedia
import Foundation
import ScreenCaptureKit
import AppKit

_ = NSApplication.shared
NSApplication.shared.setActivationPolicy(.prohibited)
var args = [String: String]()
var it = CommandLine.arguments.dropFirst().makeIterator()
while let k = it.next() { if k.hasPrefix("--") { args[String(k.dropFirst(2))] = it.next() ?? "" } }
let out = args["out"] ?? ""
if out.isEmpty { print("--out required"); exit(2) }
let fps = Int(args["fps"] ?? "60") ?? 60
let seconds = Double(args["seconds"] ?? "0") ?? 0

final class Recorder: NSObject, SCStreamOutput, SCStreamDelegate {
  var writer: AVAssetWriter!
  var input: AVAssetWriterInput!
  var stream: SCStream!
  var started = false
  var frames = 0
  var first: CMTime = .zero
  let queue = DispatchQueue(label: "rec")
  func start() async throws {
    let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
    let filter: SCContentFilter
    var w = 0, h = 0
    if let owner = args["window"] {
      guard let win = content.windows.filter({ $0.owningApplication?.applicationName == owner && $0.windowLayer == 0 && $0.frame.width > 200 }).max(by: { $0.frame.width * $0.frame.height < $1.frame.width * $1.frame.height }) else { print("no window for \(owner)"); exit(3) }
      filter = SCContentFilter(desktopIndependentWindow: win)
      let scale = NSScreen.screens.first(where: { $0.frame.intersects(CGRect(x: win.frame.minX, y: NSScreen.screens[0].frame.maxY - win.frame.maxY, width: win.frame.width, height: win.frame.height)) })?.backingScaleFactor ?? 2
      w = Int(win.frame.width * scale); h = Int(win.frame.height * scale)
      print("window \(Int(win.frame.width))x\(Int(win.frame.height)) at \(Int(win.frame.minX)),\(Int(win.frame.minY)) scale \(scale)")
    } else {
      let idx = (Int(args["display"] ?? "1") ?? 1) - 1
      let displays = content.displays.sorted { $0.displayID < $1.displayID }
      var ids = [CGDirectDisplayID](repeating: 0, count: 16); var n: UInt32 = 0
      CGGetActiveDisplayList(16, &ids, &n)
      let id = idx < Int(n) ? ids[idx] : displays[0].displayID
      guard let d = content.displays.first(where: { $0.displayID == id }) else { print("no display"); exit(3) }
      filter = SCContentFilter(display: d, excludingWindows: [])
      let mode = CGDisplayCopyDisplayMode(id)
      w = mode?.pixelWidth ?? d.width; h = mode?.pixelHeight ?? d.height
      print("display \(id) \(w)x\(h)")
    }
    w -= w % 2; h -= h % 2
    let cfg = SCStreamConfiguration()
    cfg.width = w; cfg.height = h
    cfg.minimumFrameInterval = CMTime(value: 1, timescale: CMTimeScale(fps))
    cfg.showsCursor = false
    cfg.pixelFormat = kCVPixelFormatType_32BGRA
    cfg.queueDepth = 8
    cfg.colorSpaceName = CGColorSpace.sRGB
    let url = URL(fileURLWithPath: out)
    try? FileManager.default.removeItem(at: url)
    writer = try AVAssetWriter(outputURL: url, fileType: .mov)
    input = AVAssetWriterInput(mediaType: .video, outputSettings: [
      AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: w, AVVideoHeightKey: h,
      AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: Int(Double(w * h) * Double(fps) * 0.18), AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel, AVVideoExpectedSourceFrameRateKey: fps, AVVideoMaxKeyFrameIntervalKey: fps * 2],
    ])
    input.expectsMediaDataInRealTime = true
    writer.add(input)
    stream = SCStream(filter: filter, configuration: cfg, delegate: self)
    try stream.addStreamOutput(self, type: .screen, sampleHandlerQueue: queue)
    try await stream.startCapture()
    print("recording \(w)x\(h) @\(fps) -> \(out)")
  }
  func stream(_ s: SCStream, didOutputSampleBuffer sb: CMSampleBuffer, of type: SCStreamOutputType) {
    guard type == .screen, sb.isValid,
          let att = (CMSampleBufferGetSampleAttachmentsArray(sb, createIfNecessary: false) as? [[SCStreamFrameInfo: Any]])?.first,
          let raw = att[.status] as? Int, SCFrameStatus(rawValue: raw) == .complete else { return }
    let pts = CMSampleBufferGetPresentationTimeStamp(sb)
    if !started { writer.startWriting(); writer.startSession(atSourceTime: pts); first = pts; started = true }
    if input.isReadyForMoreMediaData { input.append(sb); frames += 1 }
  }
  func stream(_ s: SCStream, didStopWithError e: Error) { print("stream stopped: \(e)") }
  func stop() async {
    try? await stream.stopCapture()
    queue.sync {}
    input.markAsFinished()
    await writer.finishWriting()
    print("saved \(frames) frames, status \(writer.status.rawValue)")
  }
}

let rec = Recorder()
let done = DispatchSemaphore(value: 0)
Task { do { try await rec.start() } catch { print("start failed: \(error)"); exit(4) } }
func finish() { Task { await rec.stop(); done.signal() } }
signal(SIGINT, SIG_IGN); signal(SIGTERM, SIG_IGN)
let s1 = DispatchSource.makeSignalSource(signal: SIGINT, queue: .main); s1.setEventHandler { finish() }; s1.resume()
let s2 = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .main); s2.setEventHandler { finish() }; s2.resume()
if seconds > 0 { DispatchQueue.main.asyncAfter(deadline: .now() + seconds) { finish() } }
DispatchQueue.global().async { done.wait(); exit(0) }
dispatchMain()
