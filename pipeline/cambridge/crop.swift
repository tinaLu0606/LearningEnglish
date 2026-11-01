// usage: swift crop.swift <pdf> <page> <x0> <y0> <x1> <y1> <out.png>
// box is in the coordinates of a 1500px-long-edge render; output is rendered at 2× that.
import Foundation
import PDFKit
import AppKit

let a = CommandLine.arguments
let doc = PDFDocument(url: URL(fileURLWithPath: a[1]))!
let page = doc.page(at: Int(a[2])! - 1)!
let box = page.bounds(for: .mediaBox)
let k: CGFloat = 2
let s = 1500 * k / max(box.width, box.height)
let img = page.thumbnail(of: NSSize(width: box.width * s, height: box.height * s), for: .mediaBox)
var r = NSRect(x: 0, y: 0, width: img.size.width, height: img.size.height)
let cg = img.cgImage(forProposedRect: &r, context: nil, hints: nil)!
let v = a[3...6].map { CGFloat(Double($0)!) * k * CGFloat(cg.width) / (img.size.width) }
let cut = cg.cropping(to: CGRect(x: v[0], y: v[1], width: v[2] - v[0], height: v[3] - v[1]))!
let rep = NSBitmapImageRep(cgImage: cut)
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: a[7]))
print("\(cut.width)x\(cut.height)")
