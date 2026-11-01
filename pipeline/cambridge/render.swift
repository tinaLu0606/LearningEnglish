// usage: swift render.swift <pdf> <page> <out.png> [longEdgePx]  → render one page to PNG
import Foundation
import PDFKit
import AppKit

let a = CommandLine.arguments
let doc = PDFDocument(url: URL(fileURLWithPath: a[1]))!
let page = doc.page(at: Int(a[2])! - 1)!
let px = CGFloat(a.count > 4 ? Double(a[4])! : 1600)
let box = page.bounds(for: .mediaBox)
let s = px / max(box.width, box.height)
let img = page.thumbnail(of: NSSize(width: box.width * s, height: box.height * s), for: .mediaBox)
let rep = NSBitmapImageRep(data: img.tiffRepresentation!)!
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: a[3]))
