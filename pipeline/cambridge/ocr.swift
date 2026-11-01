// usage: swift ocr.swift <pdf> <outdir> [first last]  → OCR each page (Vision, accurate, no autocorrect) to pNNNN.txt
import Foundation
import PDFKit
import Vision
import AppKit

let a = CommandLine.arguments
let doc = PDFDocument(url: URL(fileURLWithPath: a[1]))!
let out = URL(fileURLWithPath: a[2])
try? FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)
let first = a.count > 3 ? Int(a[3])! : 1
let last = a.count > 4 ? Int(a[4])! : doc.pageCount

for n in first...last {
    guard let page = doc.page(at: n - 1) else { continue }
    let box = page.bounds(for: .mediaBox)
    let scale: CGFloat = 2000 / max(box.width, box.height)
    let img = page.thumbnail(of: NSSize(width: box.width * scale, height: box.height * scale), for: .mediaBox)
    guard let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { continue }
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.usesLanguageCorrection = false
    req.recognitionLanguages = ["en-GB", "en-US"]
    try? VNImageRequestHandler(cgImage: cg).perform([req])
    let lines = (req.results ?? []).compactMap { $0.topCandidates(1).first?.string }
    try? lines.joined(separator: "\n").write(to: out.appendingPathComponent(String(format: "p%04d.txt", n)), atomically: true, encoding: .utf8)
}
print("done \(first)-\(last) of \(doc.pageCount)")
